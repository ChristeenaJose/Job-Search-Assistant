<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use App\Models\Skill;
use App\Models\Setting;
use App\Services\AI\EmbeddingService;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    protected EmbeddingService $embeddingService;

    public function __construct(EmbeddingService $embeddingService)
    {
        $this->embeddingService = $embeddingService;
    }
    /**
     * Get the user profile.
     */
    public function show()
    {
        $defaultData = Setting::where('key', 'default_profile_data')->first()?->value;
        $profileData = $defaultData ? json_decode($defaultData, true) : [
            'skills' => ['Shopware', 'PHP', 'Laravel', 'CSS'],
            'experience' => '5 years of full-stack development.',
            'preferences' => ['Remote Only', 'Full-time'],
            'seniority' => 'Senior',
            'tech_stack' => ['PHP', 'React', 'SQLite'],
        ];

        $profile = auth()->user()->profile ?: auth()->user()->profile()->create($profileData);

        return response()->json($profile);
    }

    /**
     * Update the user profile.
     */
    public function update(Request $request)
    {
        $profile = auth()->user()->profile ?: auth()->user()->profile()->create();

        $validated = $request->validate([
            'skills' => 'nullable|array',
            'experience' => 'nullable|string',
            'preferences' => 'nullable|array',
            'seniority' => 'nullable|string',
            'tech_stack' => 'nullable|array',
            'linkedin_link' => 'nullable|url',
            'github_link' => 'nullable|url',
            'cv' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
            'arbeitszeugnis' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
            'certificate' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
            'cover_letter' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        $data = $request->except(['cv', 'arbeitszeugnis', 'certificate', 'cover_letter']);

        // Handle File Uploads
        if ($request->hasFile('cv')) {
            $data['cv_path'] = $request->file('cv')->store('documents', 'public');
        }
        if ($request->hasFile('arbeitszeugnis')) {
            $data['arbeitszeugnis_path'] = $request->file('arbeitszeugnis')->store('documents', 'public');
        }
        if ($request->hasFile('certificate')) {
            $data['certificate_path'] = $request->file('certificate')->store('documents', 'public');
        }
        if ($request->hasFile('cover_letter')) {
            $data['cover_letter_path'] = $request->file('cover_letter')->store('documents', 'public');
        }

        // Semantic RAG: Update profile embedding when text changes
        if (isset($data['experience']) || isset($data['skills'])) {
            $profileText = ($data['experience'] ?? $profile->experience) . " " . implode(', ', $data['skills'] ?? $profile->skills);
            $data['embedding'] = $this->embeddingService->getEmbedding($profileText);
        }

        $profile->update($data);

        return response()->json($profile);
    }

    /**
     * Re-evaluating the profile based on uploaded documents or experience using AI.
     */
    public function reEvaluate()
    {
        $profile = auth()->user()->profile;
        if (!$profile)
            return response()->json(['message' => 'Profile not found'], 404);

        if ($profile) {
            $promptTemplate = Setting::where('key', 'skill_extraction_prompt')->first()?->value ?? "Extract a clean list of technical skills from this professional summary/experience: \n\n{experience}. \n\nExisting skills: {existing_skills}. \n\nReturn ONLY a comma-separated list of technical skills.";

            $prompt = str_replace(
                ['{experience}', '{existing_skills}'],
                [$profile->experience, implode(', ', $profile->skills)],
                $promptTemplate
            );

            $skillsText = $this->callAI($prompt, "You are a skill extraction tool. Return only the skills as a comma-separated list.");

            if ($skillsText) {
                $newSkills = array_map('trim', explode(',', $skillsText));
                $updatedSkills = array_unique(array_merge($profile->skills, $newSkills));

                // Update embedding
                $profileText = $profile->experience . " " . implode(', ', $updatedSkills);
                $embedding = $this->embeddingService->getEmbedding($profileText);

                $profile->update([
                    'skills' => $updatedSkills,
                    'embedding' => $embedding
                ]);
                return response()->json($profile);
            }
        }

        // Fallback or Simulated logic
        $existingSkills = collect($profile->skills)->map(fn($s) => strtolower(trim($s)));
        $detectedSkills = Skill::pluck('name')->toArray();

        $newSkills = collect($detectedSkills)
            ->filter(fn($s) => !$existingSkills->contains(strtolower(trim($s))))
            ->toArray();

        if (!empty($newSkills)) {
            $updatedSkills = array_unique(array_merge($profile->skills, $newSkills));

            // Update embedding
            $profileText = $profile->experience . " " . implode(', ', $updatedSkills);
            $embedding = $this->embeddingService->getEmbedding($profileText);

            $profile->update([
                'skills' => $updatedSkills,
                'embedding' => $embedding
            ]);
        }

        return response()->json($profile);
    }

    /**
     * Internal method to call AI (Gemini with OpenAI fallback).
     */
    private function callAI(string $prompt, string $systemPrompt = "You are a professional career assistant.")
    {
        $geminiKey = config('services.gemini.key');

        if ($geminiKey) {
            try {
                $response = \Illuminate\Support\Facades\Http::post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$geminiKey}", [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                ['text' => $systemPrompt . "\n\n" . $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.7,
                    ]
                ]);

                if ($response->successful()) {
                    return $response->json('candidates.0.content.parts.0.text');
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Profile Gemini Error: ' . $e->getMessage());
            }
        }

        $apiKey = config('services.openai.key');
        if (!$apiKey)
            return null;

        try {
            $response = \Illuminate\Support\Facades\Http::withToken($apiKey)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => 0.7,
                ]);

            if ($response->successful()) {
                return $response->json('choices.0.message.content');
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Profile OpenAI Error: ' . $e->getMessage());
        }

        return null;
    }
}

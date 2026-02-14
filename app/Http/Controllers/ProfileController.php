<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * Get the user profile.
     */
    public function show()
    {
        $profile = auth()->user()->profile ?: auth()->user()->profile()->create([
            'skills' => ['React', 'PHP', 'Laravel', 'CSS'],
            'experience' => '5 years of full-stack development.',
            'preferences' => ['Remote Only', 'Full-time'],
            'seniority' => 'Senior',
            'tech_stack' => ['PHP', 'React', 'SQLite'],
        ]);

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

        $profile->update($data);

        return response()->json($profile);
    }

    /**
     * Simulate re-evaluating the profile based on uploaded documents.
     */
    public function reEvaluate()
    {
        $profile = auth()->user()->profile;
        if (!$profile)
            return response()->json(['message' => 'Profile not found'], 404);

        // Simulate scanning CV and Arbeitszeugnis
        $existingSkills = collect($profile->skills)->map(fn($s) => strtolower(trim($s)));
        $detectedSkills = ['MySQL', 'JavaScript', 'React', 'PHP', 'Laravel', 'Docker', 'AWS', 'Tailwind CSS'];

        $newSkills = collect($detectedSkills)
            ->filter(fn($s) => !$existingSkills->contains(strtolower(trim($s))))
            ->toArray();

        if (!empty($newSkills)) {
            $updatedSkills = array_unique(array_merge($profile->skills, $newSkills));
            $profile->update(['skills' => $updatedSkills]);
        }

        return response()->json($profile);
    }
}

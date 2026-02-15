<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Models\Skill;
use App\Models\Setting;
use App\Services\AI\EmbeddingService;
use Illuminate\Http\Request;

class JobController extends Controller
{
    protected EmbeddingService $embeddingService;

    public function __construct(EmbeddingService $embeddingService)
    {
        $this->embeddingService = $embeddingService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(auth()->user()->jobApplications()->orderBy('created_at', 'desc')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'apply_link' => 'required|string',
        ]);

        $url = $request->apply_link;
        if (!filter_var($url, FILTER_VALIDATE_URL) && !str_starts_with($url, 'http')) {
            return response()->json(['errors' => ['apply_link' => ['Please provide a valid job link starting with http or https.']]], 422);
        }

        // Check for existing job to allow re-analysis instead of error
        $existingJob = auth()->user()->jobApplications()->where('apply_link', $url)->first();

        $analysis = $this->performAnalysis($url);

        if ($existingJob) {
            $existingJob->update([
                'company_name' => $analysis['company_name'],
                'position' => $analysis['position'],
                'match_score' => $analysis['match_score'],
                'description' => $analysis['description'],
                'highlights' => $analysis['highlights'],
                'missing_skills' => $analysis['missing_skills'],
                'embedding' => $analysis['embedding'] ?? null,
                'semantic_score' => $analysis['semantic_score'] ?? 0,
            ]);
            return response()->json($existingJob);
        }

        // Cross-check with existing interviews or rejected applications only for new applications
        $companyName = $analysis['company_name'];

        $existingInterview = auth()->user()->interviews()
            ->where('company_name', 'like', '%' . $companyName . '%')
            ->first();

        if ($existingInterview) {
            $verb = $existingInterview->status === 'Rejected' ? 'were rejected by' : 'already have a ' . strtolower($existingInterview->status) . ' interview with';
            return response()->json([
                'message' => "Warning: You {$verb} {$existingInterview->company_name} for the {$existingInterview->position} position. Please check your Interviews tab.",
                'error_type' => 'duplicate_interview'
            ], 409);
        }

        $existingRejection = auth()->user()->jobApplications()
            ->where('company_name', 'like', '%' . $companyName . '%')
            ->where('status', 'Rejected')
            ->first();

        if ($existingRejection) {
            return response()->json([
                'message' => "You were previously rejected by {$existingRejection->company_name}. Re-applying might not be effective right now.",
                'error_type' => 'previous_rejection'
            ], 409);
        }

        $job = auth()->user()->jobApplications()->create([
            'company_name' => $analysis['company_name'],
            'position' => $analysis['position'],
            'apply_link' => $url,
            'match_score' => $analysis['match_score'],
            'status' => 'Pending',
            'description' => $analysis['description'],
            'highlights' => $analysis['highlights'],
            'missing_skills' => $analysis['missing_skills'],
            'embedding' => $analysis['embedding'] ?? null,
            'semantic_score' => $analysis['semantic_score'] ?? 0,
        ]);

        return response()->json($job, 201);
    }

    /**
     * Re-analyze an existing job application.
     */
    public function reanalyze(JobApplication $job)
    {
        if ($job->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $analysis = $this->performAnalysis($job->apply_link);

        $job->update([
            'company_name' => $analysis['company_name'],
            'position' => $analysis['position'],
            'match_score' => $analysis['match_score'],
            'description' => $analysis['description'],
            'highlights' => $analysis['highlights'],
            'missing_skills' => $analysis['missing_skills'],
            'embedding' => $analysis['embedding'] ?? null,
            'semantic_score' => $analysis['semantic_score'] ?? 0,
        ]);

        return response()->json($job);
    }

    /**
     * Internal method to perform job link analysis.
     */
    private function performAnalysis(string $url)
    {
        // 1. Fetch User Profile
        $profile = auth()->user()->profile ?? new \App\Models\UserProfile([
            'skills' => ['React', 'PHP', 'Laravel', 'JavaScript', 'MySQL']
        ]);
        $userSkills = collect($profile->skills ?? [])->map(fn($s) => strtolower(trim($s)));

        // 2. Fetch Content
        $html = '';
        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ])->timeout(10)->get($url);

            if ($response->successful()) {
                $html = $response->body();

                // Onlyfy/Prescreen specialization: Follow the jobFrame iframe
                if (preg_match('/<iframe[^>]+id="jobFrame"[^>]+src="([^"]+)"/i', $html, $matches)) {
                    $iframeSrc = htmlspecialchars_decode(trim($matches[1]));
                    if (!str_starts_with($iframeSrc, 'http')) {
                        $parsed = parse_url($url);
                        $iframeSrc = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? '') . (str_starts_with($iframeSrc, '/') ? '' : '/') . $iframeSrc;
                    }

                    \Illuminate\Support\Facades\Log::info('Following job iframe: ' . $iframeSrc);

                    $iframeResponse = \Illuminate\Support\Facades\Http::withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Referer' => $url
                    ])->timeout(10)->get($iframeSrc);

                    if ($iframeResponse->successful()) {
                        $html .= "\n\n--- TARGET JOB CONTENT ---\n\n" . $iframeResponse->body();
                    }
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Job Scraper Fetch Error: ' . $e->getMessage());
        }

        // 3. Extract Metadata from Combined HTML
        $dom = new \DOMDocument();
        @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);
        $xpath = new \DOMXPath($dom);

        $pageTitle = $dom->getElementsByTagName('title')->item(0)?->nodeValue ?? '';

        // Use a better text extraction for the combined content
        $cleanHtml = preg_replace('/<(script|style|nav|footer|header)[^>]*>.*?<\/\1>/is', '', $html);
        $description = trim(strip_tags($cleanHtml));
        $description = preg_replace('/\s+/', ' ', $description);
        $description = mb_strcut($description, 0, 7000); // Send first 7k chars to AI

        $companyName = $xpath->query('//meta[@property="og:site_name"]/@content')->item(0)?->nodeValue ?? '';
        if (empty($companyName) || preg_match('/linkedin|indeed|glassdoor|stepstone/i', $companyName)) {
            if (preg_match('/(?:at|@| - | \| )\s*([^| \-\n]+)/i', $pageTitle, $matches))
                $companyName = $matches[1];
        }

        if (empty($companyName)) {
            $host = parse_url($url, PHP_URL_HOST);
            $companyName = ucwords(str_replace(['www.', '.com', '.org', '.net', '.io'], '', $host));
        }

        $position = trim(preg_split('/(?:at|@| - | \| )/i', $pageTitle)[0] ?? 'Software Engineer');
        if (strlen($position) < 3)
            $position = 'Software Engineer';

        // 4. AI-Powered Analysis (if key available)
        $hasAiKey = config('services.openai.key') || config('services.gemini.key');
        if ($hasAiKey) {
            $promptTemplate = Setting::where('key', 'analysis_prompt_template')->first()?->value ?? "Analyze this job description carefully. \n\nJob Title: {position} \nPortal/Site: {company_name}\nDescription Content: {description}\nUser Skills: {user_skills}.\n\nTasks:\n1. Identify the ACTUAL EMPLOYER/COMPANY (often mentioned as 'Working at...', 'The Company...', or listed in the body text like 'dsb ccb solutions'). Ignore the portal name (e.g., Onlyfy, LinkedIn).\n2. Extract ALL required technical skills (Languages, Frameworks, Tools).\n3. Compare with User Skills and identify Matching and Missing skills.\n\nReturn ONLY a JSON object:\n{\n  \"match_score\": \"High|Medium|Low\",\n  \"highlights\": [\"Matching skills...\"],\n  \"missing_skills\": [\"Required skills not found in user profile...\"],\n  \"position\": \"Refined exact job title\",\n  \"company_name\": \"The actual employer name\",\n  \"exact_tech_stack\": [\"All tech mentioned in job\"]\n}";

            $aiPrompt = str_replace(
                ['{position}', '{company_name}', '{description}', '{user_skills}'],
                [$position, $companyName, $description, $userSkills->implode(', ')],
                $promptTemplate
            );

            $aiResponse = $this->callAI($aiPrompt, "You are a professional technical recruiter. Return ONLY raw JSON. No markdown.");

            if ($aiResponse) {
                \Illuminate\Support\Facades\Log::info('AI Job Analysis Response: ' . $aiResponse);
                $cleanJson = preg_replace('/^.*?({.*}).*?$/s', '$1', $aiResponse);
                $decoded = json_decode($cleanJson, true);
                if ($decoded) {
                    // Start RAG: Generate and store embedding for semantic search
                    $embedding = $this->embeddingService->getEmbedding($description);
                    $semanticScore = 0;
                    if ($embedding && !empty($profile->embedding)) {
                        $semanticScore = $this->embeddingService->cosineSimilarity($embedding, $profile->embedding);
                    }

                    return [
                        'company_name' => $decoded['company_name'] ?? $companyName,
                        'position' => $decoded['position'] ?? $position,
                        'description' => $description ?: 'Analyzed from ' . $url,
                        'match_score' => $decoded['match_score'] ?? 'Medium',
                        'highlights' => $decoded['highlights'] ?? ['Matching Interests'],
                        'missing_skills' => $decoded['missing_skills'] ?? [],
                        'embedding' => $embedding,
                        'semantic_score' => $semanticScore,
                    ];
                }
            }
        }

        // 5. Traditional Heuristics Detection (Fallback)
        $keywords = Skill::pluck('name', 'keyword')->toArray();

        // Improved Company Detection: Look for business suffixes or keywords in the text
        if (preg_match('/([A-Z][a-z0-9&]+(?:\s+[A-Z][a-z0-9&]+)*)\s+(?:GmbH|AG|GmbH & Co\. KG|Inc\.|Corp\.)/i', $description, $compMatches)) {
            $companyName = trim($compMatches[0]);
        } elseif (preg_match('/(?:employer|company):\s*([^\n.;]+)/i', $description, $compMatches)) {
            $companyName = trim($compMatches[1]);
        }

        $textContent = strtolower($html . ' ' . $url . ' ' . $pageTitle . ' ' . $description);
        $detectedSkills = [];
        foreach ($keywords as $key => $label) {
            if (preg_match('/\b' . preg_quote($key, '/') . '\b/i', $textContent)) {
                $detectedSkills[$label] = true;
            }
        }
        $jobRequirements = array_keys($detectedSkills);

        $highlights = [];
        $missingSkills = [];
        foreach ($jobRequirements as $req) {
            if ($userSkills->contains(strtolower($req))) {
                $highlights[] = $req;
            } else {
                $missingSkills[] = $req;
            }
        }

        $matchPercentage = count($jobRequirements) > 0 ? (count($highlights) / count($jobRequirements)) * 100 : 0;
        $matchScore = 'Low';
        if ($matchPercentage >= 60)
            $matchScore = 'High';
        elseif ($matchPercentage >= 30)
            $matchScore = 'Medium';

        // 6. Final Data Assembly (Heuristics Fallback)
        $analysis = [
            'company_name' => $companyName,
            'position' => $position,
            'description' => $description ?: 'Analyzed from ' . $url,
            'match_score' => $matchScore,
            'highlights' => $highlights ?: ['Matching Interests'],
            'missing_skills' => $missingSkills,
            'embedding' => null,
            'semantic_score' => 0,
        ];

        // 7. Semantic Match Analysis (RAG Integration for fallback)
        if (!empty($profile->embedding)) {
            $analysis['embedding'] = $this->embeddingService->getEmbedding($analysis['description']);
            if ($analysis['embedding']) {
                $analysis['semantic_score'] = $this->embeddingService->cosineSimilarity(
                    $analysis['embedding'],
                    $profile->embedding
                );
            }
        }

        return $analysis;
    }

    /**
     * Internal method to call OpenAI API.
     */
    private function callAI(string $prompt, string $systemPrompt = "You are a professional career assistant.")
    {
        $geminiKey = config('services.gemini.key');

        // 1. Try Google Gemini (Free Tier)
        if ($geminiKey) {
            $models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

            foreach ($models as $model) {
                try {
                    $response = \Illuminate\Support\Facades\Http::post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$geminiKey}", [
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

                    if ($response->status() !== 429) {
                        \Illuminate\Support\Facades\Log::error("Gemini AI ({$model}) Failed: " . $response->body());
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Gemini AI ({$model}) Exception: " . $e->getMessage());
                }
            }
        }

        // 2. Fallback to OpenAI / Helicone
        $apiKey = config('services.openai.key');
        $heliconeKey = config('services.openai.helicone_key');

        if (!$apiKey) {
            return null;
        }

        $apiUrl = $heliconeKey
            ? 'https://oai.helicone.ai/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';

        try {
            $request = \Illuminate\Support\Facades\Http::withToken($apiKey);

            if ($heliconeKey) {
                $request->withHeaders([
                    'Helicone-Auth' => "Bearer {$heliconeKey}"
                ]);
            }

            $response = $request->post($apiUrl, [
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
            \Illuminate\Support\Facades\Log::error('OpenAI Error: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, JobApplication $job)
    {
        if ($job->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $job->update($request->all());

        // Sync changes to linked interviews
        $linkedInterviews = \App\Models\Interview::where('job_application_id', $job->id);

        // Update basic info in interviews if they changed in the application
        if ($request->has('company_name') || $request->has('position')) {
            $linkedInterviews->update([
                'company_name' => $job->company_name,
                'position' => $job->position
            ]);
        }

        // If the application is currently "Rejected", ensure all linked interviews are "Rejected"
        if ($job->status === 'Rejected') {
            $updated = \App\Models\Interview::where('job_application_id', $job->id)
                ->update(['status' => 'Rejected']);

            // Fallback for unlinked records with same company name
            if ($updated === 0) {
                \App\Models\Interview::where('user_id', auth()->id())
                    ->where('company_name', 'like', '%' . trim($job->company_name) . '%')
                    ->update(['status' => 'Rejected']);
            }
        }

        return response()->json($job);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(JobApplication $job)
    {
        if ($job->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $job->delete();
        return response()->json(null, 204);
    }

    /**
     * Remove multiple resources from storage.
     */
    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:job_applications,id',
        ]);

        auth()->user()->jobApplications()->whereIn('id', $validated['ids'])->delete();

        return response()->json(null, 204);
    }

    /**
     * Analyze a job and generate tailored documents.
     */
    public function generateDocs(JobApplication $job)
    {
        if ($job->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $profile = auth()->user()->profile;
        $skills = implode(', ', $profile->skills ?? []);
        $experience = $profile->experience ?? 'Not specified';

        // 1. Generate Cover Letter (Template Based)
        $clContent = "Dear Hiring Manager at {$job->company_name},\n\n" .
            "I am writing to express my strong interest in the {$job->position} position. " .
            "With my background in " . implode(', ', array_slice($profile->skills ?? [], 0, 3)) . ", " .
            "I am confident that my skills align well with the requirements of your team.\n\n" .
            "My experience in " . (count($profile->skills ?? []) > 3 ? $profile->skills[3] . " and deeper technical implementations" : "professional software development") . " " .
            "has prepared me to contribute effectively to your projects at {$job->company_name}.\n\n" .
            "Thank you for your time and consideration. I look forward to the possibility of discussing how my background can support your goals.\n\n" .
            "Sincerely,\n" . auth()->user()->name;

        // 2. Generate ATS-Friendly CV Content (Template Based)
        $cvContent = "PROFESSIONAL SUMMARY: \n" .
            "Targeted for: {$job->position} at {$job->company_name}\n\n" .
            "Technical Expertise: " . implode(', ', $profile->skills ?? []) . "\n" .
            "Key Industry Match: " . implode(', ', $job->highlights ?? []) . "\n\n" .
            "Professional Experience Summary:\n" .
            mb_strcut($experience, 0, 500) . "...";

        $cvPath = 'tailored/cv_' . $job->id . '.txt';
        $clPath = 'tailored/cl_' . $job->id . '.txt';

        \Illuminate\Support\Facades\Storage::disk('public')->put($cvPath, $cvContent);
        \Illuminate\Support\Facades\Storage::disk('public')->put($clPath, $clContent);

        $job->update([
            'tailored_cv' => $cvContent,
            'tailored_cover_letter' => $clContent,
            'tailored_cv_path' => $cvPath,
            'tailored_cover_letter_path' => $clPath,
        ]);

        return response()->json($job);
    }
}

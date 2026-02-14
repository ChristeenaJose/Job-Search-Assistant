<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\Request;

class JobController extends Controller
{
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
        $validated = $request->validate([
            'apply_link' => 'required|url|unique:job_applications,apply_link',
        ]);

        $analysis = $this->performAnalysis($validated['apply_link']);

        $job = auth()->user()->jobApplications()->create([
            'company_name' => $analysis['company_name'],
            'position' => $analysis['position'],
            'apply_link' => $validated['apply_link'],
            'match_score' => $analysis['match_score'],
            'status' => 'Pending',
            'description' => $analysis['description'],
            'highlights' => $analysis['highlights'],
            'missing_skills' => $analysis['missing_skills'],
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
            if ($response->successful())
                $html = $response->body();
        } catch (\Exception $e) {
        }

        // 3. Extract Metadata
        $dom = new \DOMDocument();
        @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);
        $xpath = new \DOMXPath($dom);

        $pageTitle = $dom->getElementsByTagName('title')->item(0)?->nodeValue ?? '';
        $description = $xpath->query('//meta[@name="description"]/@content')->item(0)?->nodeValue
            ?? $xpath->query('//meta[@property="og:description"]/@content')->item(0)?->nodeValue
            ?? '';

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

        // 4. Skills Detection
        $keywords = [
            'react' => 'React',
            'php' => 'PHP',
            'laravel' => 'Laravel',
            'mysql' => 'MySQL',
            'javascript' => 'JavaScript',
            'js' => 'JavaScript',
            'typescript' => 'TypeScript',
            'ts' => 'TypeScript',
            'python' => 'Python',
            'aws' => 'AWS',
            'docker' => 'Docker',
            'tailwind' => 'Tailwind CSS',
            'node' => 'Node.js',
            'vue' => 'Vue.js',
            'postgres' => 'PostgreSQL',
            'golang' => 'Go',
            'rust' => 'Rust',
            'kubernetes' => 'Kubernetes',
            'redis' => 'Redis',
            'graphql' => 'GraphQL',
            'nextjs' => 'Next.js'
        ];

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
            if ($userSkills->contains(strtolower($req)))
                $highlights[] = $req;
            else
                $missingSkills[] = $req;
        }

        $matchPercentage = count($jobRequirements) > 0 ? (count($highlights) / count($jobRequirements)) * 100 : 0;
        $matchScore = 'Low';
        if ($matchPercentage > 70)
            $matchScore = 'High';
        elseif ($matchPercentage > 30)
            $matchScore = 'Medium';

        return [
            'company_name' => $companyName,
            'position' => $position,
            'description' => $description ?: 'Analyzed from ' . $url,
            'match_score' => $matchScore,
            'highlights' => $highlights ?: ['Matching Interests'],
            'missing_skills' => $missingSkills,
        ];
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
        // Simulating Step C (Auto-Application Generator)
        $cvContent = "Tailored CV for " . $job->company_name . "\nFocused on " . implode(', ', $job->highlights);
        $clContent = "Dear Hiring Manager at " . $job->company_name . ",\n\nI am excited to apply for the " . $job->position . " role. With my background in PHP and React...";

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

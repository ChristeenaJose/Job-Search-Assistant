<?php

namespace App\Http\Controllers;

use App\Models\Interview;
use App\Models\JobApplication;
use Illuminate\Http\Request;

class InterviewController extends Controller
{
    /**
     * Display a listing of interviews.
     */
    public function index()
    {
        return response()->json(auth()->user()->interviews()->orderBy('scheduled_at', 'desc')->get());
    }

    /**
     * Store a newly created interview.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'job_application_id' => 'nullable|exists:job_applications,id',
            'company_name' => 'required|string',
            'position' => 'nullable|string',
            'interview_link' => 'nullable|string',
            'mail_content' => 'nullable|string',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
            'scheduled_at' => 'nullable|date',
        ]);

        // Cross-check for existing interviews or applications
        $existingInterview = auth()->user()->interviews()
            ->where('company_name', 'like', '%' . $validated['company_name'] . '%')
            ->first();

        if ($existingInterview) {
            // If it exists but isn't linked to this job application, link it now
            if ($request->job_application_id && !$existingInterview->job_application_id) {
                $existingInterview->update(['job_application_id' => $request->job_application_id]);
                return response()->json($existingInterview, 200);
            }

            return response()->json([
                'message' => 'Warning: You already have a scheduled or completed interview with ' . $existingInterview->company_name . ' for the position of ' . $existingInterview->position . '.',
                'interview' => $existingInterview
            ], 409);
        }

        $interview = auth()->user()->interviews()->create($validated);

        // Update application status if linked
        if ($request->job_application_id) {
            JobApplication::where('id', $request->job_application_id)->update(['status' => 'Interview']);
        }

        return response()->json($interview, 201);
    }

    /**
     * Display the specified interview.
     */
    public function show(Interview $interview)
    {
        if ($interview->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return response()->json($interview);
    }

    /**
     * Update the specified interview.
     */
    public function update(Request $request, Interview $interview)
    {
        if ($interview->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $interview->update($request->all());
        return response()->json($interview);
    }

    /**
     * Remove the specified interview.
     */
    public function destroy(Interview $interview)
    {
        if ($interview->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $interview->delete();
        return response()->json(null, 204);
    }

    /**
     * Check company status for duplicate detection.
     */
    public function checkCompany(Request $request)
    {
        $companyName = $request->query('name');
        if (!$companyName)
            return response()->json(['status' => 'clean']);

        $existingJob = auth()->user()->jobApplications()
            ->where('company_name', 'like', '%' . $companyName . '%')
            ->first();

        $existingInterview = auth()->user()->interviews()
            ->where('company_name', 'like', '%' . $companyName . '%')
            ->first();

        if ($existingInterview) {
            $statusText = $existingInterview->status === 'Rejected' ? "was rejected post-interview" : "is currently " . strtolower($existingInterview->status);
            return response()->json([
                'status' => 'warning',
                'message' => "Existing interview found for {$existingInterview->company_name} which {$statusText}. Please check your Interviews tab.",
                'type' => 'interview'
            ]);
        }

        if ($existingJob && $existingJob->status === 'Rejected') {
            return response()->json([
                'status' => 'warning',
                'message' => "You were previously rejected by {$existingJob->company_name}. Waiting for further response might be better.",
                'type' => 'rejected'
            ]);
        }

        if ($existingJob) {
            return response()->json([
                'status' => 'info',
                'message' => "Existing application found for {$existingJob->company_name} as {$existingJob->position}. Current status: {$existingJob->status}.",
                'type' => 'application'
            ]);
        }

        return response()->json(['status' => 'clean']);
    }
}

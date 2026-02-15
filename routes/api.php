<?php

use App\Http\Controllers\JobController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('register', [\App\Http\Controllers\AuthController::class, 'register']);
Route::post('login', [\App\Http\Controllers\AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [\App\Http\Controllers\AuthController::class, 'logout']);
    Route::get('me', [\App\Http\Controllers\AuthController::class, 'me']);

    Route::delete('jobs/bulk-delete', [JobController::class, 'bulkDestroy']);
    Route::apiResource('jobs', JobController::class);
    Route::post('jobs/{job}/reanalyze', [JobController::class, 'reanalyze']);
    Route::post('jobs/{job}/generate-docs', [JobController::class, 'generateDocs']);

    Route::get('profile', [\App\Http\Controllers\ProfileController::class, 'show']);
    Route::post('profile', [\App\Http\Controllers\ProfileController::class, 'update']);
    Route::post('profile/re-evaluate', [\App\Http\Controllers\ProfileController::class, 'reEvaluate']);

    Route::get('interviews/check-company', [\App\Http\Controllers\InterviewController::class, 'checkCompany']);
    Route::apiResource('interviews', \App\Http\Controllers\InterviewController::class);
});

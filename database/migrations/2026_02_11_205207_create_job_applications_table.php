<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->string('company_name')->nullable();
            $table->string('position')->nullable();
            $table->string('match_score')->nullable();
            $table->string('apply_link')->nullable();
            $table->string('status')->default('Pending');
            $table->longText('description')->nullable();
            $table->json('highlights')->nullable();
            $table->json('missing_skills')->nullable();
            $table->longText('tailored_cv')->nullable();
            $table->longText('tailored_cover_letter')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};

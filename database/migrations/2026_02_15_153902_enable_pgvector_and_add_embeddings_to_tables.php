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
        // 1. Enable pgvector extension (only if on PostgreSQL)
        if (config('database.default') === 'pgsql') {
            try {
                \Illuminate\Support\Facades\DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Vector extension not available yet.');
            }
        }

        // 2. Add embedding to job_applications
        Schema::table('job_applications', function (Blueprint $table) {
            if (config('database.default') === 'pgsql') {
                // If on Postgres, try to use the native vector type
                try {
                    \Illuminate\Support\Facades\DB::statement('ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS embedding vector(1536)');
                } catch (\Exception $e) {
                    $table->json('embedding')->nullable();
                }
            } else {
                $table->json('embedding')->nullable();
            }
        });

        // 3. Add embedding to user_profiles
        Schema::table('user_profiles', function (Blueprint $table) {
            if (config('database.default') === 'pgsql') {
                try {
                    \Illuminate\Support\Facades\DB::statement('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS embedding vector(1536)');
                } catch (\Exception $e) {
                    $table->json('embedding')->nullable();
                }
            } else {
                $table->json('embedding')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropColumn('embedding');
        });
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('embedding');
        });
    }
};

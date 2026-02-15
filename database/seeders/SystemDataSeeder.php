<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SystemDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Skills
        $skills = [
            ['name' => 'React', 'keyword' => 'react'],
            ['name' => 'PHP', 'keyword' => 'php'],
            ['name' => 'Laravel', 'keyword' => 'laravel'],
            ['name' => 'MySQL', 'keyword' => 'mysql'],
            ['name' => 'JavaScript', 'keyword' => 'javascript'],
            ['name' => 'TypeScript', 'keyword' => 'typescript'],
            ['name' => 'Python', 'keyword' => 'python'],
            ['name' => 'AWS', 'keyword' => 'aws'],
            ['name' => 'Docker', 'keyword' => 'docker'],
            ['name' => 'Tailwind CSS', 'keyword' => 'tailwind'],
            ['name' => 'Node.js', 'keyword' => 'node'],
            ['name' => 'Vue.js', 'keyword' => 'vue'],
            ['name' => 'PostgreSQL', 'keyword' => 'postgres'],
            ['name' => 'Go', 'keyword' => 'golang'],
            ['name' => 'Rust', 'keyword' => 'rust'],
            ['name' => 'Kubernetes', 'keyword' => 'kubernetes'],
            ['name' => 'Redis', 'keyword' => 'redis'],
            ['name' => 'GraphQL', 'keyword' => 'graphql'],
            ['name' => 'Next.js', 'keyword' => 'nextjs'],
        ];

        foreach ($skills as $skill) {
            \App\Models\Skill::updateOrCreate(['keyword' => $skill['keyword']], $skill);
        }

        // Settings / Prompts
        $settings = [
            [
                'key' => 'cl_prompt_template',
                'group' => 'ai_prompts',
                'value' => "Write a professional cover letter for the position of {position} at {company_name}. \nUser Skills: {skills}. \nExperience: {experience}. \nJob Description: {description}. \nKeep it concise, professional, and tailored to the job."
            ],
            [
                'key' => 'cv_prompt_template',
                'group' => 'ai_prompts',
                'value' => "Create a tailored, ATS-friendly professional summary and key achievements section for a CV. \nTarget Role: {position} at {company_name}. \nUser Background: {experience}. \nUser Skills: {skills}. \nFocus on matching the job description: {description}."
            ],
            [
                'key' => 'analysis_prompt_template',
                'group' => 'ai_prompts',
                'value' => "Analyze this job description for a software engineering role. \nJob Position: {position} at {company_name}.\nDescription: {description}.\nUser Skills: {user_skills}.\n\nBased on this, return a JSON object with:\n- match_score (High, Medium, or Low)\n- highlights (array of matching skills or strengths)\n- missing_skills (array of skills present in job but missing from user)\n- position (refined position if better than the one provided)\n- company_name (refined company if better than the one provided)"
            ],
            [
                'key' => 'skill_extraction_prompt',
                'group' => 'ai_prompts',
                'value' => "Extract a clean list of technical skills from this professional summary/experience: \n\n{experience}. \n\nExisting skills: {existing_skills}. \n\nReturn ONLY a comma-separated list of technical skills."
            ],
            [
                'key' => 'default_profile_data',
                'group' => 'defaults',
                'value' => json_encode([
                    'skills' => ['React', 'PHP', 'Laravel', 'CSS'],
                    'experience' => '5 years of full-stack development.',
                    'preferences' => ['Remote Only', 'Full-time'],
                    'seniority' => 'Senior',
                    'tech_stack' => ['PHP', 'React', 'SQLite'],
                ])
            ],
        ];

        foreach ($settings as $setting) {
            \App\Models\Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}

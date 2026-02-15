<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $fillable = [
        'company_name',
        'position',
        'match_score',
        'apply_link',
        'status',
        'description',
        'highlights',
        'missing_skills',
        'tailored_cv',
        'tailored_cover_letter',
        'tailored_cv_path',
        'tailored_cover_letter_path',
        'user_id',
        'embedding',
        'semantic_score',
    ];

    protected $appends = [
        'tailored_cv_url',
        'tailored_cover_letter_url',
    ];

    protected $casts = [
        'highlights' => 'array',
        'missing_skills' => 'array',
        'embedding' => 'array',
    ];

    public function getTailoredCvUrlAttribute()
    {
        return $this->tailored_cv_path ? asset('storage/' . $this->tailored_cv_path) : null;
    }

    public function getTailoredCoverLetterUrlAttribute()
    {
        return $this->tailored_cover_letter_path ? asset('storage/' . $this->tailored_cover_letter_path) : null;
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

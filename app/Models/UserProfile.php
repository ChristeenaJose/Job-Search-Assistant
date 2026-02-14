<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'skills',
        'experience',
        'preferences',
        'seniority',
        'tech_stack',
        'linkedin_link',
        'github_link',
        'cv_path',
        'arbeitszeugnis_path',
        'certificate_path',
        'cover_letter_path',
        'user_id',
    ];

    protected $appends = [
        'cv_url',
        'arbeitszeugnis_url',
        'certificate_url',
        'cover_letter_url',
    ];

    protected $casts = [
        'skills' => 'array',
        'preferences' => 'array',
        'tech_stack' => 'array',
    ];

    public function getCvUrlAttribute()
    {
        return $this->cv_path ? asset('storage/' . $this->cv_path) : null;
    }

    public function getArbeitszeugnisUrlAttribute()
    {
        return $this->arbeitszeugnis_path ? asset('storage/' . $this->arbeitszeugnis_path) : null;
    }

    public function getCertificateUrlAttribute()
    {
        return $this->certificate_path ? asset('storage/' . $this->certificate_path) : null;
    }

    public function getCoverLetterUrlAttribute()
    {
        return $this->cover_letter_path ? asset('storage/' . $this->cover_letter_path) : null;
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

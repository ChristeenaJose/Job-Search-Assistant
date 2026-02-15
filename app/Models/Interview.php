<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Interview extends Model
{
    protected $fillable = [
        'user_id',
        'job_application_id',
        'company_name',
        'position',
        'interview_link',
        'mail_content',
        'notes',
        'scheduled_at',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function jobApplication()
    {
        return $this->belongsTo(JobApplication::class);
    }
}

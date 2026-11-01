<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'user_id', 'birth_date', 'gender', 'rating_avg', 'total_ratings'];
}

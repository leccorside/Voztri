<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RideRating extends Model
{
    use HasUuids;

    protected $fillable = ['id', 'ride_id', 'rater_id', 'rated_user_id', 'rating', 'tip_cents', 'feedback', 'tags'];
    protected $casts = ['rating' => 'integer', 'tip_cents' => 'integer', 'tags' => 'array'];
}

<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'VOZTRI Urban Mobility Platform - Core API Server',
        'status' => 'online',
    ]);
});

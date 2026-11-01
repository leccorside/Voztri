<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (string) $user->id === (string) $id;
});

// Canal da Corrida (para passageiro e motorista alocados)
Broadcast::channel('ride.{rideId}', function ($user, $rideId) {
    return true; // Autenticado no contexto da corrida
});

// Canal de Localização do Motorista
Broadcast::channel('driver.location.{driverId}', function ($user, $driverId) {
    return true;
});

// Canal de Operações do Painel Admin
Broadcast::channel('admin.operations', function ($user) {
    return $user->role === 'admin';
});

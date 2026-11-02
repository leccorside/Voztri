<?php

return [
    /*
    | Push (Firebase Cloud Messaging, API HTTP v1). Android e iOS (via APNs no
    | console do Firebase). Sem FCM_CREDENTIALS o envio fica desligado
    | (NullPushNotifier). Caminho dentro do contêiner, ex.:
    | /var/www/html/storage/app/firebase/service-account.json
    */
    'fcm' => [
        'credentials' => env('FCM_CREDENTIALS'),
    ],

    /*
    | Geocodificação (Photon / OpenStreetMap). Em desenvolvimento, a instância
    | pública photon.komoot.io (gratuita, uso justo, sem SLA: recebe as coordenadas
    | do embarque, arredondadas a ~11 m). Para produção, um Photon próprio: basta
    | trocar a URL. O User-Agent identifica o app para o provedor.
    */
    'photon' => [
        'url' => env('PHOTON_GEOCODING_URL', 'https://photon.komoot.io'),
        'user_agent' => env('PHOTON_USER_AGENT', 'VOZTRI/1.0 (desenvolvimento)'),
    ],
];

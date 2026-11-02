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
];

<?php

return static function (array $allowedMethods, bool $allowCredentials = false): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $currentOrigin = $host !== '' ? (($https ? 'https://' : 'http://') . $host) : '';
    $configuredOrigins = getenv('CORS_ALLOWED_ORIGIN') ?: '';

    $allowedOrigins = array_values(array_filter(array_map(
        static fn($value) => trim($value),
        explode(',', $configuredOrigins)
    )));

    $isAllowedOrigin = false;
    if ($origin !== '') {
        if (!empty($allowedOrigins)) {
            $isAllowedOrigin = in_array($origin, $allowedOrigins, true);
        } elseif ($currentOrigin !== '') {
            $isAllowedOrigin = strcasecmp($origin, $currentOrigin) === 0;
        }
    }

    if ($isAllowedOrigin) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
        if ($allowCredentials) {
            header('Access-Control-Allow-Credentials: true');
        }
    }

    header('Access-Control-Allow-Methods: ' . implode(', ', $allowedMethods));
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With');
};
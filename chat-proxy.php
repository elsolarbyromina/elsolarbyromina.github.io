<?php
// chat-proxy.php

// 1. Encabezados de seguridad (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// 2. TU CLAVE DE API (¡Asegúrate de pegarla bien!)
// IMPORTANTE: No debe tener espacios al principio ni al final.
$apiKey = "AIzaSyDq3yAvMZIyXMMd7mtOzVf3WV4qNQm2bQo"; 

// 3. Manejo de solicitud preliminar (OPTIONS) para navegadores
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 4. Validar método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Método no permitido"]);
    exit;
}

// 5. Obtener datos del cliente
$inputJSON = file_get_contents('php://input');
if (!$inputJSON) {
    http_response_code(400);
    echo json_encode(["error" => "Cuerpo de solicitud vacío"]);
    exit;
}

// 6. URL DE GOOGLE (Versión estable corregida)
// Usamos 'gemini-1.5-flash' sin agregados, es la más segura.
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;

// 7. Iniciar cURL
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $inputJSON);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// 8. Ejecutar
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

curl_close($ch);

// 9. Manejo de errores y respuesta
if ($curlError) {
    http_response_code(500);
    echo json_encode(["error" => "Error interno cURL: " . $curlError]);
} else {
    // Si Google devuelve error (400, 403, 404, 500), lo pasamos al JS para que sepa
    if ($httpCode >= 400) {
        http_response_code($httpCode);
    }
    echo $response;
}
?>
<?php
/**
 * DriveOne - Endpoint PHP para Hosting Ferozo / DonWeb
 * Permite recibir consultas o reclamos enviados desde la aplicación o formularios.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'online',
        'service' => 'DriveOne API / Contact Handler',
        'version' => '2.0.0',
        'timestamp' => date('c')
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true) ?: $_POST;

    $name = trim($data['name'] ?? $data['student'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $message = trim($data['message'] ?? $data['claim'] ?? '');
    $school = trim($data['school'] ?? 'No especificada');

    if (empty($name) || empty($message)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Nombre y mensaje son requeridos.'
        ]);
        exit;
    }

    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'message' => 'Mensaje recibido correctamente en el servidor.',
        'data' => [
            'name' => $name,
            'phone' => $phone,
            'school' => $school,
            'date' => date('Y-m-d H:i:s')
        ]
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

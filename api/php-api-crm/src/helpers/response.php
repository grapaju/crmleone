<?php
function sendResponse($statusCode, $data = null, $message = null) {
    http_response_code($statusCode);
    $response = [
        'status' => $statusCode,
        'data' => $data,
        'message' => $message
    ];
    echo json_encode($response);
    exit;
}

function sendSuccessResponse($data, $message = 'Success') {
    sendResponse(200, $data, $message);
}

function sendErrorResponse($statusCode, $message) {
    sendResponse($statusCode, null, $message);
}
?>
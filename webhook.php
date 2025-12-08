<?php
/**
 * Moneyspec Webhook Handler
 * 
 * This endpoint receives webhook callbacks from Moneyspec payment gateway.
 * It forwards the request to the Node.js backend API for processing.
 */

header('Content-Type: application/json');

// Get the backend API URL from environment or use default
$backendUrl = getenv('BACKEND_URL') ?: 'http://localhost:3001';
$webhookEndpoint = $backendUrl . '/api/payments/moneyspec/webhook';

// Get the raw POST data
$rawData = file_get_contents('php://input');
$payload = json_decode($rawData, true);

// Get headers
$headers = getallheaders();

// Prepare the request to forward to Node.js backend
$requestHeaders = [
    'Content-Type: application/json',
    'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? ''),
    'X-Original-User-Agent: ' . ($_SERVER['HTTP_USER_AGENT'] ?? ''),
];

// Forward any Moneyspec-specific headers
if (isset($headers['X-Moneyspec-Signature'])) {
    $requestHeaders[] = 'X-Moneyspec-Signature: ' . $headers['X-Moneyspec-Signature'];
}

$ch = curl_init($webhookEndpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $rawData);
curl_setopt($ch, CURLOPT_HTTPHEADER, $requestHeaders);

// Execute the request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Return the response from backend
http_response_code($httpCode);
echo $response;

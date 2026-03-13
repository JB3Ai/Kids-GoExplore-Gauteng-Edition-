<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid email required']);
    exit;
}

$email = filter_var($input['email'], FILTER_SANITIZE_EMAIL);
$phone = isset($input['phone']) ? substr(preg_replace('/[^0-9+\- ]/', '', $input['phone']), 0, 20) : '';
$source = isset($input['source']) ? substr(strip_tags($input['source']), 0, 100) : 'Kids GoExplore';

$to = 'lead@jonoblackburn.com';
$subject = 'Friday Brief Subscription - ' . $source;

$body = "New Friday Brief subscriber:\n\n";
$body .= "Email: " . $email . "\n";
if ($phone) $body .= "Phone: " . $phone . "\n";
$body .= "Source: " . $source . "\n";
$body .= "Date: " . date('Y-m-d H:i:s T') . "\n";

$headers = "From: noreply@jonoblackburn.com\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Mail delivery failed']);
}

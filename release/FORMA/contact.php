<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Strict']);
session_start();
function reply(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
$configPath = __DIR__ . '/config/config.js';
try {
    $source = (string)file_get_contents($configPath);
    if (!preg_match('/window\.SITE_CONFIG\s*=\s*(\{.*\})\s*;?\s*$/s', $source, $match)) {
        throw new RuntimeException('Invalid configuration');
    }
    $config = json_decode($match[1], true, 512, JSON_THROW_ON_ERROR);
    $config['form']['services'] = array_merge(array_column($config['services'], 'short'), $config['form']['additionalServices']);
} catch (Throwable $e) {
    reply(503, ['success' => false, 'message' => 'Contact service unavailable.']);
}
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'token') {
    reply(200, ['token' => $_SESSION['csrf']]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, GET');
    reply(405, ['success' => false, 'message' => 'Method not allowed.']);
}
if (!($config['form']['enabled'] ?? false)) {
    reply(503, ['success' => false, 'message' => 'Contact form unavailable.']);
}
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 24000) {
    reply(413, ['success' => false, 'message' => 'Request too large.']);
}
function field(string $key): string {
    $value = $_POST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}
if (!hash_equals($_SESSION['csrf'], field('csrf'))) {
    reply(403, ['success' => false, 'message' => 'Refresh the page and try again.']);
}
if (field('website') !== '') {
    reply(422, ['success' => false, 'message' => 'Invalid request.']);
}
$name = field('name');
$email = field('email');
$company = field('company');
$service = field('service');
$message = field('message');
function textLength(string $value): int {
    $count = preg_match_all('/./us', $value);
    return $count === false ? strlen($value) : $count;
}
$limit = max(20, min(10000, (int)($config['form']['maxMessageLength'] ?? 5000)));
$min = max(1, min($limit, (int)($config['form']['minMessageLength'] ?? 20)));
if (textLength($name) < 2 || textLength($name) > 400 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 || preg_match('/[\r\n]/', $email . $name) || textLength($company) > 600 || textLength($message) < $min || textLength($message) > $limit || !in_array($service, $config['form']['services'], true) || field('consent') !== 'yes') {
    reply(422, ['success' => false, 'message' => 'Please check the required fields.']);
}
$recipient = (string)($config['email'] ?? '');
if (!filter_var($recipient, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $recipient) || str_ends_with(strtolower($recipient), '.example')) {
    reply(503, ['success' => false, 'message' => 'Email delivery is not configured.']);
}
$cooldown = max(10, (int)($config['form']['rateLimitSeconds'] ?? 60));
if (time() - (int)($_SESSION['last_submission'] ?? 0) < $cooldown) {
    header('Retry-After: ' . $cooldown);
    reply(429, ['success' => false, 'message' => 'Please wait before sending another request.']);
}
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$ratePath = sys_get_temp_dir() . '/agency-form-' . hash('sha256', __DIR__ . $ip);
$lock = fopen($ratePath, 'c+');
if (!$lock || !flock($lock, LOCK_EX)) {
    reply(503, ['success' => false, 'message' => 'Please try again later.']);
}
$last = (int)stream_get_contents($lock);
if (time() - $last < $cooldown) {
    flock($lock, LOCK_UN);
    fclose($lock);
    header('Retry-After: ' . $cooldown);
    reply(429, ['success' => false, 'message' => 'Please wait before sending another request.']);
}
ftruncate($lock, 0);
rewind($lock);
fwrite($lock, (string)time());
flock($lock, LOCK_UN);
fclose($lock);
$subjectText = preg_replace('/[\r\n]+/', ' ', (string)($config['form']['subject'] ?? 'Website enquiry'));
$subject = '=?UTF-8?B?' . base64_encode($subjectText) . '?=';
$body = "Company: " . $config['companyName'] . "\nName: " . $name . "\nEmail: " . $email . "\nOrganisation: " . $company . "\nService: " . $service . "\n\nMessage:\n" . $message . "\n\nPrivacy consent: Yes\nReceived (UTC): " . gmdate('c');
$headers = ['From' => $recipient, 'Reply-To' => $email, 'MIME-Version' => '1.0', 'Content-Type' => 'text/plain; charset=UTF-8'];
try {
    $sent = mail($recipient, $subject, $body, $headers);
} catch (Throwable $e) {
    $sent = false;
}
if (!$sent) {
    reply(502, ['success' => false, 'message' => 'The mail server could not accept your enquiry.']);
}
$_SESSION['last_submission'] = time();
$_SESSION['csrf'] = bin2hex(random_bytes(32));
reply(200, ['success' => true, 'message' => $config['form']['successMessage'], 'token' => $_SESSION['csrf']]);

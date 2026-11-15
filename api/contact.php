<?php
// Contact handler for the enquiry forms. Needs api/config.php (copy config.sample.php, set 'to' and 'from').
header('Content-Type: application/json; charset=utf-8');
function out($ok, $err = null, $code = 200) { http_response_code($code); echo json_encode(['ok' => $ok, 'error' => $err], JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(false, 'Methode nicht erlaubt.', 405);
$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) out(false, 'Der Versand ist noch nicht eingerichtet.', 503);
$cfg = require $cfgFile;
if (empty($cfg['to']) || empty($cfg['from'])) out(false, 'Der Versand ist noch nicht eingerichtet.', 503);
if (!empty($_POST['website'])) out(true); // honeypot: pretend success

$clean = fn($k, $max) => trim(mb_substr(preg_replace('/[\r\n\t]+/', ' ', (string)($_POST[$k] ?? '')), 0, $max));
$name = $clean('name', 80); $tel = $clean('telefon', 30); $ort = $clean('ort', 60); $anl = $clean('anliegen', 80); $seite = $clean('seite', 120);
$msg = trim(mb_substr(str_replace("\r", '', (string)($_POST['nachricht'] ?? '')), 0, 2000));
if (mb_strlen($name) < 2 || !preg_match('/^[+()\d][\d\s\/()+\-]{5,}$/', $tel) || $ort === '' || empty($_POST['datenschutz'])) out(false, 'Bitte alle Pflichtfelder ausfüllen.', 422);

// simple rate limit: 1 request / 20 s per IP
$ipf = sys_get_temp_dir() . '/dw_' . md5($_SERVER['REMOTE_ADDR'] ?? '');
if (is_file($ipf) && time() - filemtime($ipf) < 20) out(false, 'Bitte einen Moment warten.', 429);
touch($ipf);

$body = "Neue Anfrage über die Website\n\nName: $name\nTelefon: $tel\nOrt: $ort\nAnliegen: $anl\nSeite: $seite\n\n$msg\n";
$b = 'dw' . bin2hex(random_bytes(8));
$h = "From: {$cfg['from']}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"$b\"\r\n";
$m = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$body\r\n";
$files = $_FILES['fotos'] ?? null;
if ($files && is_array($files['name'])) {
  $n = 0; $ok = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
  foreach ($files['name'] as $i => $nm) {
    if ($files['error'][$i] !== UPLOAD_ERR_OK || $n >= 3 || $files['size'][$i] > 5 * 1024 * 1024) continue;
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($files['tmp_name'][$i]);
    if (!isset($ok[$mime])) continue;
    $n++; $m .= "--$b\r\nContent-Type: $mime; name=\"foto$n.{$ok[$mime]}\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"foto$n.{$ok[$mime]}\"\r\n\r\n" . chunk_split(base64_encode(file_get_contents($files['tmp_name'][$i]))) . "\r\n";
  }
}
$m .= "--$b--";
$subject = '=?UTF-8?B?' . base64_encode("Website-Anfrage: $anl ($name)") . '?=';
if (!mail($cfg['to'], $subject, $m, $h)) out(false, 'Der Versand ist fehlgeschlagen.', 500);
out(true);

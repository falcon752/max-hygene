<?php
/**
 * Max-Hygiene — SMTP Connection Test
 * Open this file in a browser (on a PHP server) to diagnose email issues.
 * DELETE this file after testing.
 */

$env = parse_ini_file(__DIR__ . '/.env');
define('SMTP_HOST', $env['SMTP_HOST']);
define('SMTP_PORT', $env['SMTP_PORT']);
define('SMTP_USER', $env['SMTP_USER']);
define('SMTP_PASS', $env['SMTP_PASS']);

$steps = [];
$ok    = true;

// ── Step 1: TCP connect ──────────────────────────────────
$conn = @fsockopen(SMTP_HOST, SMTP_PORT, $errno, $errstr, 15);
if (!$conn) {
    $steps[] = ['fail', "TCP connect to ssl://smtp.gmail.com:465 — $errstr ($errno)"];
    $ok = false;
} else {
    $steps[] = ['pass', 'TCP connect to ssl://smtp.gmail.com:465'];
}

if ($ok) {
    $r = fn() => fgets($conn, 512);
    $w = fn($l) => fputs($conn, "$l\r\n");

    $greeting = $r();
    $steps[] = ['info', 'Greeting: ' . trim($greeting)];

    // ── Step 2: EHLO ──────────────────────────────────────
    $w('EHLO localhost');
    $ehlo = '';
    while ($l = $r()) { $ehlo .= $l; if ($l[3] === ' ') break; }
    $steps[] = ['pass', 'EHLO sent'];
}

if ($ok) {
    $r = fn() => fgets($conn, 512);
    $w = fn($l) => fputs($conn, "$l\r\n");

    // ── Step 5: AUTH LOGIN ────────────────────────────────
    $w('AUTH LOGIN');
    $r();
    $w(base64_encode(SMTP_USER));
    $r();
    $w(base64_encode(SMTP_PASS));
    $authResp = trim($r());

    if (substr($authResp, 0, 3) !== '235') {
        $steps[] = ['fail', "AUTH LOGIN failed: $authResp — check app password is correct and 2FA is enabled on the Google account"];
        $ok = false;
    } else {
        $steps[] = ['pass', "AUTH LOGIN successful — credentials accepted"];
    }
}

if ($ok) {
    $r = fn() => fgets($conn, 512);
    $w = fn($l) => fputs($conn, "$l\r\n");

    // ── Step 6: Send test email ───────────────────────────
    $to      = SMTP_USER;
    $subject = 'Max-Hygiene SMTP Test — ' . date('d M Y H:i');
    $body    = '<p>This is a test email from the Max-Hygiene booking system. If you see this, email sending is working correctly.</p>';

    $w('MAIL FROM: <' . SMTP_USER . '>');
    $r();
    $w("RCPT TO: <$to>");
    $r();
    $w('DATA');
    $r();

    $msg  = 'From: Max-Hygiene <' . SMTP_USER . ">\r\n";
    $msg .= "To: <$to>\r\n";
    $msg .= "Subject: $subject\r\n";
    $msg .= "MIME-Version: 1.0\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
    $msg .= $body . "\r\n.\r\n";

    fputs($conn, $msg);
    $sendResp = trim($r());

    $w('QUIT');
    fclose($conn);

    if (substr($sendResp, 0, 3) === '250') {
        $steps[] = ['pass', "Test email sent to $to — check your inbox"];
    } else {
        $steps[] = ['fail', "DATA send failed: $sendResp"];
        $ok = false;
    }
}

// ── Render ───────────────────────────────────────────────
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SMTP Test — Max-Hygiene</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Poppins', sans-serif; background: #f7fafc; padding: 40px 20px; color: #2d3748; }
  .card { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.08); overflow: hidden; }
  .card-header { background: linear-gradient(135deg,#3bb0bd,#2d3748); padding: 24px 30px; color: #fff; }
  .card-header h1 { font-size: 1.2rem; }
  .card-header p  { font-size: .82rem; opacity: .75; margin-top: 4px; }
  .steps { padding: 24px 30px; }
  .step { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px dashed #edf2f7; font-size: .875rem; }
  .step:last-child { border-bottom: none; }
  .badge { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .65rem; font-weight: 700; }
  .pass  .badge { background: #00d97e; color: #fff; }
  .fail  .badge { background: #fc5c7d; color: #fff; }
  .info  .badge { background: #3bb0bd; color: #fff; }
  .pass  .msg { color: #276749; }
  .fail  .msg { color: #9b2335; font-weight: 600; }
  .info  .msg { color: #4a5568; }
  .result { padding: 16px 30px; font-size: .9rem; font-weight: 600; text-align: center; }
  .result.ok   { background: #f0fff4; color: #276749; }
  .result.fail { background: #fff5f5; color: #9b2335; }
  .footer-note { padding: 14px 30px; font-size: .75rem; color: #718096; background: #f7fafc; border-top: 1px solid #edf2f7; }
</style>
</head>
<body>
<div class="card">
  <div class="card-header">
    <h1>&#128231; SMTP Connection Test</h1>
    <p>Testing Gmail SMTP with atikuquadrisegun@gmail.com</p>
  </div>
  <div class="steps">
    <?php foreach ($steps as [$type, $msg]): ?>
      <div class="step <?= $type ?>">
        <div class="badge"><?= $type === 'pass' ? '✓' : ($type === 'fail' ? '✕' : 'i') ?></div>
        <div class="msg"><?= htmlspecialchars($msg) ?></div>
      </div>
    <?php endforeach; ?>
  </div>
  <div class="result <?= $ok ? 'ok' : 'fail' ?>">
    <?= $ok ? '✓ All checks passed — email delivery is working' : '✕ Test failed — see the step above for the cause' ?>
  </div>
  <div class="footer-note">
    Delete <strong>test-smtp.php</strong> from your server after testing.
  </div>
</div>
</body>
</html>

<?php
/**
 * Max-Hygiene — Booking Email Handler
 * Sends booking confirmation emails via Gmail SMTP (no dependencies).
 */

header('Content-Type: application/json');

// ── Reject non-POST ──
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// ── Gmail SMTP credentials ──
const SMTP_HOST   = 'smtp.gmail.com';
const SMTP_PORT   = 587;
const SMTP_USER   = 'atikuquadrisegun@gmail.com';
const SMTP_PASS   = 'qocgdwsmhdxtcqed';
const FROM_NAME   = 'Max-Hygiene Bookings';
const ADMIN_EMAIL = 'atikuquadrisegun@gmail.com';

// ── Parse JSON body ──
$input = file_get_contents('php://input');
$data  = json_decode($input, true);

if (!$data || !isset($data['adminData'], $data['clientData'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid request data']);
    exit;
}

$admin  = $data['adminData'];
$client = $data['clientData'];

// ── Send admin notification ──
$adminSubject  = 'New Booking: ' . c($admin['service_name']) . ' — ' . c($admin['from_name']);
$adminResult   = smtp_send(ADMIN_EMAIL, FROM_NAME, $adminSubject, buildAdminEmail($admin));

// ── Send client confirmation ──
$clientSubject = 'Your Max-Hygiene Booking — ' . c($client['booking_ref']);
$clientResult  = smtp_send(c($client['to_email']), c($client['to_name']), $clientSubject, buildClientEmail($client));

if ($adminResult['ok'] && $clientResult['ok']) {
    echo json_encode(['success' => true]);
} elseif ($adminResult['ok']) {
    echo json_encode(['success' => true, 'note' => 'Booking received. Client confirmation may have failed.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $adminResult['err'] ?? 'SMTP delivery failed']);
}

// ────────────────────────────────────────────
// Gmail SMTP sender (STARTTLS, no dependencies)
// ────────────────────────────────────────────
function smtp_send(string $to, string $toName, string $subject, string $html): array
{
    $conn = @fsockopen(SMTP_HOST, SMTP_PORT, $errno, $errstr, 15);
    if (!$conn) {
        return ['ok' => false, 'err' => "Connect failed: $errstr ($errno)"];
    }

    $r = fn() => fgets($conn, 512);
    $w = fn($l) => fputs($conn, "$l\r\n");

    $r(); // 220 greeting

    $w('EHLO ' . (gethostname() ?: 'localhost'));
    while ($l = $r()) if ($l[3] === ' ') break;

    $w('STARTTLS');
    $r(); // 220

    if (!@stream_socket_enable_crypto($conn, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        fclose($conn);
        return ['ok' => false, 'err' => 'TLS handshake failed'];
    }

    $w('EHLO ' . (gethostname() ?: 'localhost'));
    while ($l = $r()) if ($l[3] === ' ') break;

    $w('AUTH LOGIN');
    $r();
    $w(base64_encode(SMTP_USER));
    $r();
    $w(base64_encode(SMTP_PASS));
    $authResp = $r();

    if (substr($authResp, 0, 3) !== '235') {
        fclose($conn);
        return ['ok' => false, 'err' => "Auth failed: $authResp"];
    }

    $w('MAIL FROM: <' . SMTP_USER . '>');
    $r();
    $w("RCPT TO: <$to>");
    $r();
    $w('DATA');
    $r();

    $enc  = fn($s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
    $msg  = 'From: '    . $enc(FROM_NAME) . ' <' . SMTP_USER . ">\r\n";
    $msg .= "To: {$enc($toName)} <$to>\r\n";
    $msg .= 'Subject: ' . $enc($subject)  . "\r\n";
    $msg .= "MIME-Version: 1.0\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
    $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $msg .= chunk_split(base64_encode($html)) . "\r\n.\r\n";

    fputs($conn, $msg);
    $resp = $r();
    $w('QUIT');
    fclose($conn);

    return substr($resp, 0, 3) === '250'
        ? ['ok' => true]
        : ['ok' => false, 'err' => "Send failed: $resp"];
}

// ── Sanitise helper ──
function c($v): string
{
    return htmlspecialchars(strip_tags(trim((string)$v)), ENT_QUOTES, 'UTF-8');
}

// ────────────────────────────────────────────
// Admin notification email
// ────────────────────────────────────────────
function buildAdminEmail(array $d): string
{
    $name    = c($d['from_name']        ?? '');
    $email   = c($d['from_email']       ?? '');
    $phone   = c($d['phone']            ?? '');
    $service = c($d['service_name']     ?? '');
    $addr    = c($d['service_address']  ?? '');
    $city    = c($d['city']             ?? '');
    $post    = c($d['postcode']         ?? '');
    $date    = c($d['appointment_date'] ?? '');
    $time    = c($d['appointment_time'] ?? '');
    $freq    = c($d['frequency']        ?? '');
    $pricing = c($d['pricing_type']     ?? '');
    $addons  = c($d['addons_list']      ?? 'None');
    $total   = c($d['total_price']      ?? '');
    $notes   = c($d['special_notes']    ?? 'None');
    $ref     = c($d['booking_ref']      ?? '');
    $prop    = c($d['property_type']    ?? '');
    $beds    = c($d['bedrooms']         ?? '');
    $baths   = c($d['bathrooms']        ?? '');

    return <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7fafc;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

  <tr><td style="background:linear-gradient(135deg,#3bb0bd,#2d3748);padding:30px 40px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">&#128203; New Booking Request</h1>
    <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px;">Max-Hygiene Professional Cleaning</p>
  </td></tr>

  <tr><td style="background:#e8f7f8;padding:14px 40px;text-align:center;border-bottom:1px solid #d1eef0;">
    <p style="margin:0;font-size:12px;color:#718096;text-transform:uppercase;letter-spacing:.5px;">Booking Reference</p>
    <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#3bb0bd;letter-spacing:2px;">$ref</p>
  </td></tr>

  <tr><td style="padding:30px 40px;">

    <h2 style="color:#2d3748;font-size:15px;margin:0 0 14px;border-bottom:2px solid #3bb0bd;padding-bottom:8px;">&#128100; Client Details</h2>
    <table width="100%" cellpadding="7" cellspacing="0">
      <tr>
        <td style="color:#718096;font-size:13px;width:38%;">Full Name</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$name</td>
      </tr>
      <tr style="background:#f7fafc;">
        <td style="color:#718096;font-size:13px;">Email</td>
        <td style="font-size:13px;"><a href="mailto:$email" style="color:#3bb0bd;font-weight:600;">$email</a></td>
      </tr>
      <tr>
        <td style="color:#718096;font-size:13px;">Phone</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$phone</td>
      </tr>
      <tr style="background:#f7fafc;">
        <td style="color:#718096;font-size:13px;">Service Address</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$addr, $city, $post</td>
      </tr>
    </table>

    <h2 style="color:#2d3748;font-size:15px;margin:22px 0 14px;border-bottom:2px solid #3bb0bd;padding-bottom:8px;">&#129529; Service Details</h2>
    <table width="100%" cellpadding="7" cellspacing="0">
      <tr>
        <td style="color:#718096;font-size:13px;width:38%;">Service Type</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$service</td>
      </tr>
      <tr style="background:#f7fafc;">
        <td style="color:#718096;font-size:13px;">Property</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$prop &mdash; $beds bed / $baths bath</td>
      </tr>
      <tr>
        <td style="color:#718096;font-size:13px;">Pricing Type</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$pricing</td>
      </tr>
      <tr style="background:#f7fafc;">
        <td style="color:#718096;font-size:13px;">Extra Services</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$addons</td>
      </tr>
      <tr>
        <td style="color:#718096;font-size:13px;">Frequency</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$freq</td>
      </tr>
    </table>

    <h2 style="color:#2d3748;font-size:15px;margin:22px 0 14px;border-bottom:2px solid #3bb0bd;padding-bottom:8px;">&#128197; Appointment</h2>
    <table width="100%" cellpadding="7" cellspacing="0">
      <tr>
        <td style="color:#718096;font-size:13px;width:38%;">Date</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$date</td>
      </tr>
      <tr style="background:#f7fafc;">
        <td style="color:#718096;font-size:13px;">Time</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$time</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:linear-gradient(135deg,#e8f7f8,#f0fbfc);border-radius:10px;border:1px solid #b2d8db;">
      <tr>
        <td style="padding:16px 20px;font-size:14px;color:#4a5568;font-weight:600;">Estimated Total</td>
        <td style="padding:16px 20px;text-align:right;font-size:24px;font-weight:700;color:#3bb0bd;">$total</td>
      </tr>
    </table>

    <div style="margin-top:18px;background:#fffbeb;border-left:4px solid #f6c90e;padding:12px 16px;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:13px;color:#744210;"><strong>Special Notes:</strong> $notes</p>
    </div>

    <div style="margin-top:18px;text-align:center;">
      <a href="mailto:$email" style="display:inline-block;background:#3bb0bd;color:#fff;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Reply to Client</a>
    </div>

  </td></tr>

  <tr><td style="background:#2d3748;padding:14px 40px;text-align:center;">
    <p style="color:rgba(255,255,255,.5);margin:0;font-size:11px;">Max-Hygiene &bull; Glasgow G3 7PR &bull; +44 7743173136</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>
HTML;
}

// ────────────────────────────────────────────
// Client confirmation email
// ────────────────────────────────────────────
function buildClientEmail(array $d): string
{
    $toName  = c($d['to_name']           ?? '');
    $service = c($d['service_name']      ?? '');
    $date    = c($d['appointment_date']  ?? '');
    $time    = c($d['appointment_time']  ?? '');
    $ref     = c($d['booking_ref']       ?? '');
    $total   = c($d['total_price']       ?? '');
    $pricing = c($d['pricing_type']      ?? '');
    $notes   = c($d['notes']             ?? 'No special instructions');

    return <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7fafc;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

  <tr><td style="background:linear-gradient(135deg,#3bb0bd,#00d97e);padding:40px;text-align:center;">
    <div style="width:68px;height:68px;background:rgba(255,255,255,.25);border-radius:50%;margin:0 auto 16px;line-height:68px;font-size:30px;">&#10003;</div>
    <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">Booking Received!</h1>
    <p style="color:rgba(255,255,255,.85);margin:10px 0 0;font-size:14px;">We&rsquo;ll be in touch shortly to confirm your appointment.</p>
  </td></tr>

  <tr><td style="background:#e8f7f8;padding:16px 40px;text-align:center;border-bottom:1px solid #d1eef0;">
    <p style="margin:0;font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:.5px;">Your Booking Reference</p>
    <p style="margin:5px 0 0;font-size:22px;font-weight:700;color:#3bb0bd;letter-spacing:2px;">$ref</p>
  </td></tr>

  <tr><td style="padding:30px 40px;">

    <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Hi <strong style="color:#2d3748;">$toName</strong>, thank you for choosing Max-Hygiene.
      Here&rsquo;s a summary of your booking request:
    </p>

    <table width="100%" cellpadding="9" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <tr style="background:#f7fafc;">
        <td style="color:#718096;font-size:13px;width:40%;border-bottom:1px solid #e2e8f0;">Service</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;border-bottom:1px solid #e2e8f0;">$service</td>
      </tr>
      <tr>
        <td style="color:#718096;font-size:13px;border-bottom:1px solid #e2e8f0;">Date</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;border-bottom:1px solid #e2e8f0;">$date</td>
      </tr>
      <tr style="background:#f7fafc;">
        <td style="color:#718096;font-size:13px;border-bottom:1px solid #e2e8f0;">Time</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;border-bottom:1px solid #e2e8f0;">$time</td>
      </tr>
      <tr>
        <td style="color:#718096;font-size:13px;border-bottom:1px solid #e2e8f0;">Pricing</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;border-bottom:1px solid #e2e8f0;">$pricing</td>
      </tr>
      <tr style="background:#f7fafc;">
        <td style="color:#718096;font-size:13px;">Notes</td>
        <td style="font-weight:600;color:#2d3748;font-size:13px;">$notes</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:linear-gradient(135deg,#e8f7f8,#f0fbfc);border-radius:12px;border:1px solid #b2d8db;">
      <tr>
        <td style="padding:22px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#718096;text-transform:uppercase;letter-spacing:.5px;">Estimated Total</p>
          <p style="margin:8px 0 0;font-size:30px;font-weight:700;color:#3bb0bd;">$total</p>
        </td>
      </tr>
    </table>

    <div style="margin-top:20px;background:#fffbeb;border-left:4px solid #f6c90e;padding:14px 16px;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:13px;color:#744210;line-height:1.7;">
        <strong>No payment required today.</strong>
        Our team will contact you within 24 hours to confirm the appointment and finalise details.
        If you chose a flat rate, the final price will be agreed with you beforehand.
      </p>
    </div>

    <div style="margin-top:24px;text-align:center;padding:20px;background:#f7fafc;border-radius:10px;">
      <p style="color:#718096;font-size:13px;margin:0 0 8px;">Questions? We&rsquo;re here to help:</p>
      <p style="margin:0;font-size:14px;">
        <a href="mailto:MaxHygiene100@gmail.com" style="color:#3bb0bd;font-weight:600;text-decoration:none;">MaxHygiene100@gmail.com</a>
        &nbsp;&bull;&nbsp;
        <a href="tel:+447743173136" style="color:#3bb0bd;font-weight:600;text-decoration:none;">+44 7743173136</a>
      </p>
    </div>

  </td></tr>

  <tr><td style="background:#2d3748;padding:16px 40px;text-align:center;">
    <p style="color:rgba(255,255,255,.5);margin:0 0 4px;font-size:12px;">Max-Hygiene &bull; Technology House, 9 Newton Place, Glasgow G3 7PR</p>
    <p style="color:rgba(255,255,255,.3);margin:0;font-size:11px;">Please do not reply to this automated email. Contact us directly using the details above.</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>
HTML;
}

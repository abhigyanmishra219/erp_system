import nodemailer, { type Transporter } from "nodemailer";

interface SmtpConfig {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

function getSmtpConfig(): SmtpConfig {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = parseInt(
    process.env.EMAIL_PORT || process.env.SMTP_PORT || "587",
    10
  );
  const secure =
    process.env.EMAIL_SECURE === "true" ||
    process.env.SMTP_SECURE === "true" ||
    port === 465;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass =
    process.env.EMAIL_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.SMTP_PASS;
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    (user ? `"Dhurava ERP" <${user}>` : '"Dhurava ERP" <no-reply@dhurava.com>');

  return { host, port, secure, user, pass, from };
}

let cachedTransporter: Transporter | null = null;

function getTransporter(config: SmtpConfig): Transporter | null {
  if (!config.host || !config.user || !config.pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  return cachedTransporter;
}

/**
 * Sends a 6-digit OTP verification email for password reset.
 * Strictly adheres to Dhurava ERP's email format requirements.
 */
export async function sendPasswordResetOtpEmail(
  to: string,
  otp: string
): Promise<boolean> {
  const config = getSmtpConfig();
  const transporter = getTransporter(config);

  const subject = "Dhurava ERP Password Reset OTP";
  const textContent = `Hello,\n\nWe received a request to reset your Dhurava ERP password.\n\nYour verification code is:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.\n\nRegards,\nDhurava ERP Team`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; padding: 32px 28px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">Dhurava ERP</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #64748b; font-weight: 500;">School Management Platform</p>
            </td>
          </tr>
          <!-- Body Message -->
          <tr>
            <td style="padding-bottom: 20px; line-height: 1.6; font-size: 15px; color: #334155;">
              <p style="margin: 0 0 12px;">Hello,</p>
              <p style="margin: 0 0 16px;">We received a request to reset your Dhurava ERP password.</p>
              <p style="margin: 0 0 8px; font-weight: 600; color: #0f172a;">Your verification code is:</p>
            </td>
          </tr>
          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #f1f5f9; border: 1.5px dashed #4f46e5; border-radius: 12px; padding: 14px 28px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4338ca;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>
          <!-- Expiration notice -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
            </td>
          </tr>
          <!-- Security Notice -->
          <tr>
            <td style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 16px;">If you did not request a password reset, you can safely ignore this email.</p>
              <p style="margin: 0; color: #64748b; font-weight: 500;">
                Regards,<br>
                <strong style="color: #334155;">Dhurava ERP Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.from,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return true;
    } catch (err) {
      console.error("Failed to deliver OTP email via configured SMTP:", err instanceof Error ? err.message : "Unknown error");
      throw new Error("Failed to send verification code email. Please check email service configuration.");
    }
  }

  // Fallback when SMTP is not configured
  if (process.env.NODE_ENV === "production") {
    console.error("Production email delivery failed: EMAIL_HOST / EMAIL_USER are not configured in environment variables.");
    throw new Error("Email service is not configured. Please contact the system administrator.");
  }

  // In development, log a notice for testing purposes
  console.info(`[DEV EMAIL DISPATCH] To: ${to} | Verification OTP: ${otp}`);
  return true;
}

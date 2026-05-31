import { Resend } from "resend";
import nodemailer from "nodemailer";

const resendApiKey = process.env.RESEND_API_KEY || "";
const emailFrom = process.env.EMAIL_FROM || "onboarding@resend.dev";
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

// SMTP configuration (for free domain-less sending)
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = parseInt(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

const smtpTransporter = smtpHost && smtpUser && smtpPass 
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

export async function sendPublishedEmail(opts: {
  to: string;
  platform: "LINKEDIN" | "TWITTER" | "INSTAGRAM";
  topic: string;
  content: string;
}) {
  const platformLabel = { LINKEDIN: "LinkedIn", TWITTER: "Twitter / X", INSTAGRAM: "Instagram" }[opts.platform];
  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;padding:32px 24px;color:#0f172a">
      <h1 style="font-size:22px;margin:0 0 8px">Time to post on ${platformLabel} ✅</h1>
      <p style="color:#475569;margin:0 0 20px">Here&apos;s the content from your Social Studio queue &mdash; copy and paste it onto ${platformLabel}:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.6">${escapeHtml(opts.content)}</div>
      <p style="color:#64748b;margin-top:24px;font-size:13px">Topic: <em>${escapeHtml(opts.topic)}</em></p>
      <p style="color:#94a3b8;margin-top:32px;font-size:12px">This is a portfolio demo &mdash; copy the post above and paste it on ${platformLabel} to publish. (Real auto-publishing requires LinkedIn/X/Meta business app approval.)</p>
    </div>
  `;

  // Route 1: SMTP Transporter (if configured)
  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: emailFrom,
        to: opts.to,
        subject: `Time to post on ${platformLabel} ✅`,
        html,
      });
      console.log(`[email] email sent via SMTP successfully to ${opts.to}`);
      return { sent: true };
    } catch (err) {
      console.error("[email] SMTP send failed", err);
      return { error: err instanceof Error ? err.message : "SMTP send failed" };
    }
  }

  // Route 2: Resend Client (fallback)
  if (resendClient) {
    try {
      await resendClient.emails.send({
        from: emailFrom,
        to: opts.to,
        subject: `Time to post on ${platformLabel} ✅`,
        html,
      });
      console.log(`[email] email sent via Resend successfully to ${opts.to}`);
      return { sent: true };
    } catch (err) {
      console.error("[email] Resend send failed", err);
      return { error: err instanceof Error ? err.message : "Resend send failed" };
    }
  }

  console.warn("[email] neither SMTP nor Resend is configured, skipping email send");
  return { skipped: true };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

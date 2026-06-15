import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "placeholder-resend-key");

export async function sendEventApprovedEmail(
  submitterEmail: string,
  eventName: string,
  eventId: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!apiKey) {
    console.error("Approval email skipped: RESEND_API_KEY is not set");
    return;
  }

  const eventUrl = `${siteUrl}/event/${eventId}`;
  const name = eventName || "Your event";

  try {
    const { data, error } = await resend.emails.send({
      from: `Find Your Night <${fromEmail}>`,
      to: submitterEmail,
      subject: "Your event is live on Find Your Night 🎉",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #09090F; color: #ffffff; padding: 32px 16px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px 24px; text-align: center;">
            <h1 style="font-size: 28px; letter-spacing: 1px; margin: 0 0 16px; color: #ffffff;">You're Live! 🎉</h1>
            <p style="font-size: 16px; line-height: 1.5; color: rgba(255,255,255,0.8); margin: 0 0 24px;">
              Great news — <strong>${name}</strong> has been approved and is now live on Find Your Night.
            </p>
            <a href="${eventUrl}" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 12px; font-size: 16px;">
              View Your Event
            </a>
            <p style="font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.6); margin: 24px 0 0;">
              Share it with your crowd so they don't miss out:
            </p>
            <p style="font-size: 14px; word-break: break-all; margin: 8px 0 0;">
              <a href="${eventUrl}" style="color: #FF6B35;">${eventUrl}</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Approval email error (Resend API):", error);
    } else {
      console.log("Approval email sent:", data?.id);
    }
  } catch (err) {
    console.error("Approval email error (exception):", err);
  }
}

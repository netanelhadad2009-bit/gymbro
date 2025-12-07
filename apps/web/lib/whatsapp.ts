/**
 * WhatsApp Notification Helper
 *
 * This module sends WhatsApp notifications via Twilio's WhatsApp API.
 * Used to notify the admin when users sign up or make purchases.
 *
 * Required Environment Variables:
 * - TWILIO_ACCOUNT_SID: Twilio account SID
 * - TWILIO_AUTH_TOKEN: Twilio auth token
 * - TWILIO_WHATSAPP_FROM: Twilio WhatsApp sender number (e.g., whatsapp:+14155238886)
 * - ADMIN_WHATSAPP_NUMBER: Your WhatsApp number to receive notifications (e.g., whatsapp:+972501234567)
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER;

// Check if WhatsApp notifications are configured
const isConfigured = Boolean(
  TWILIO_ACCOUNT_SID &&
    TWILIO_AUTH_TOKEN &&
    TWILIO_WHATSAPP_FROM &&
    ADMIN_WHATSAPP_NUMBER
);

if (!isConfigured) {
  console.warn(
    "[WhatsApp] Not configured – missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, or ADMIN_WHATSAPP_NUMBER"
  );
}

/**
 * Send a WhatsApp message via Twilio API
 */
async function sendWhatsAppMessage(message: string): Promise<boolean> {
  if (!isConfigured) {
    console.warn("[WhatsApp] sendWhatsAppMessage skipped – missing config");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString(
            "base64"
          ),
      },
      body: new URLSearchParams({
        From: TWILIO_WHATSAPP_FROM!,
        To: ADMIN_WHATSAPP_NUMBER!,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[WhatsApp] ❌ Twilio API error:", response.status, errorText);
      return false;
    }

    console.log("[WhatsApp] ✅ Message sent successfully");
    return true;
  } catch (err) {
    console.error("[WhatsApp] ❌ Error sending message:", err);
    return false;
  }
}

// ============================================================================
// Notification Templates
// ============================================================================

/**
 * Notify admin of new user signup
 */
export async function notifyNewSignup(data: {
  email: string | null;
  fullName: string | null;
  source: string | null;
}): Promise<boolean> {
  const name = data.fullName || "Unknown";
  const email = data.email || "No email";
  const source = data.source || "Unknown";

  const message = `🎉 *New User Signup!*

👤 Name: ${name}
📧 Email: ${email}
📱 Source: ${source}
🕐 Time: ${new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`;

  return sendWhatsAppMessage(message);
}

/**
 * Notify admin of new subscription purchase
 */
export async function notifyNewPurchase(data: {
  email: string | null;
  fullName: string | null;
  plan: string;
  status: string;
}): Promise<boolean> {
  const name = data.fullName || "Unknown";
  const email = data.email || "No email";
  const planEmoji = data.plan === "yearly" ? "🏆" : "💎";
  const planLabel = data.plan === "yearly" ? "שנתי (Yearly)" : "חודשי (Monthly)";

  const message = `💰 *New Purchase!*

👤 Name: ${name}
📧 Email: ${email}
${planEmoji} Plan: ${planLabel}
📊 Status: ${data.status}
🕐 Time: ${new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`;

  return sendWhatsAppMessage(message);
}

/**
 * Check if WhatsApp notifications are configured
 */
export function isWhatsAppConfigured(): boolean {
  return isConfigured;
}

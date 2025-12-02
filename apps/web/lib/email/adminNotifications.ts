import { Resend } from "resend";

// Lazy-load Resend client to avoid build-time initialization errors
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

type NewSubscriptionPayload = {
  userId: string;
  plan: string | null;
  status: string | null;
  appleOriginalTransactionId?: string | null;
  appleProductId?: string | null;
  createdAt?: Date | string | null;
};

export async function sendNewSubscriptionEmail(payload: NewSubscriptionPayload) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[AdminEmail] RESEND_API_KEY is not configured, skipping email");
    return;
  }

  try {
    const {
      userId,
      plan,
      status,
      appleOriginalTransactionId,
      appleProductId,
      createdAt,
    } = payload;

    const created =
      createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();

    const subject = `🔥 New FitJourney subscription – plan: ${plan ?? "unknown"}`;

    const textLines = [
      "New subscription created in FitJourney:",
      "",
      `User ID: ${userId}`,
      `Plan: ${plan ?? "N/A"}`,
      `Status: ${status ?? "N/A"}`,
      `Apple Product ID: ${appleProductId ?? "N/A"}`,
      `Original Transaction ID: ${appleOriginalTransactionId ?? "N/A"}`,
      `Created at: ${created}`,
    ];

    await resend.emails.send({
      from: "FitJourney <no-reply@fitjourney.app>",
      to: ["fitjourneyapp12@gmail.com"],
      subject,
      text: textLines.join("\n"),
    });

    console.log("[AdminEmail] New subscription email sent successfully", {
      userId,
      plan,
      status,
    });
  } catch (error) {
    console.error("[AdminEmail] Failed to send new subscription email", error);
  }
}

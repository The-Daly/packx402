import { serverEnv } from "@/server/env";

/**
 * Minimal transactional email abstraction. EMAIL_PROVIDER=console (the default) logs the
 * message instead of sending it — safe for local dev/CI, and the only path exercised so
 * far. EMAIL_PROVIDER=smtp is a documented follow-up: wire in a real SMTP client (e.g.
 * nodemailer) using SMTP_HOST/PORT/USER/PASSWORD once a real provider is configured.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (serverEnv.EMAIL_PROVIDER === "console") {
    console.log(`[email:console] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }
  throw new Error(
    `EMAIL_PROVIDER=${serverEnv.EMAIL_PROVIDER} is not implemented yet — see src/server/email/send.ts`,
  );
}

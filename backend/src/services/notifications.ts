import nodemailer from "nodemailer";

type NotificationType = "confirmed" | "cancelled" | "rescheduled";

type BookingNotificationInput = {
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  startAtIso: string;
  endAtIso: string;
  hostName: string;
};

const hasSmtpConfig =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_PORT) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS);

const smtpPass = (process.env.SMTP_PASS || "").trim();

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass,
      },
    })
  : null;

function subjectByType(type: NotificationType) {
  if (type === "cancelled") return "Booking cancelled";
  if (type === "rescheduled") return "Booking rescheduled";
  return "Booking confirmed";
}

async function sendBookingNotification(input: BookingNotificationInput) {
  const subject = subjectByType(input.type);
  const body = `Hello ${input.recipientName},\n\n${subject}\n\nEvent: ${input.eventTitle}\nHost: ${input.hostName}\nStart: ${new Date(input.startAtIso).toLocaleString()}\nEnd: ${new Date(input.endAtIso).toLocaleString()}\n\nThank you.`;

  if (!transporter || !process.env.SMTP_FROM) {
    console.log("[notification:mock]", {
      to: input.recipientEmail,
      subject,
      body,
    });
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.recipientEmail,
    subject,
    text: body,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function sendBookingNotificationWithRetry(
  input: BookingNotificationInput,
  maxAttempts = 3,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sendBookingNotification(input);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(attempt * 750);
      }
    }
  }

  throw lastError;
}

function dispatchBookingNotification(
  input: BookingNotificationInput,
  context: string,
) {
  setImmediate(() => {
    void sendBookingNotificationWithRetry(input).catch((error) => {
      console.error(`[notification:${context}] failed after retries`, error);
    });
  });
}

export {
  dispatchBookingNotification,
  sendBookingNotification,
  sendBookingNotificationWithRetry,
};

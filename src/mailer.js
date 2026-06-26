import nodemailer from "nodemailer";
import { config } from "./config.js";

let transporter;

function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth:
        config.smtp.user && config.smtp.pass
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const mail = {
    from: config.smtp.from,
    to,
    subject,
    html,
    text
  };

  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.info("[email disabled]", mail);
    return { queued: false };
  }

  await activeTransporter.sendMail(mail);
  return { queued: true };
}


const crypto = require("crypto");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const PROD = process.env.NODE_ENV === "production";

let tx = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  const port = +process.env.SMTP_PORT || 465;
  tx = require("nodemailer").createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log(
    `Email: sending through ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}`,
  );
} else {
  console.log(
    "Email: SMTP is not set. Codes will be printed in this terminal (development only).",
  );
}

async function sendCode(u, code, kind) {
  const reset = kind === "reset";
  const label = reset ? "password reset" : "verification";
  if (!tx) {
    if (PROD) throw new Error("Email service is not configured");
    console.log(`\n[DEV ONLY] ${label} code for ${u.email}: ${code}\n`);
    return;
  }
  try {
    await tx.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: u.email,
      subject: `${code} is your JobPilot ${label} code`,
      text:
        `Hi ${u.name},\n\nYour JobPilot ${label} code is ${code}. It expires in 10 minutes.\n\n` +
        (reset
          ? "If you did not ask to reset your password, ignore this email. Your password is safe."
          : "If you did not create this account, you can ignore this email."),
    });
    console.log(`Email sent to ${u.email}`);
  } catch (err) {
    console.error("Email failed:", err.message);
    throw err;
  }
}

const hash = (u, code, kind) =>
  crypto
    .createHash("sha256")
    .update(`${kind}:${code}:${u.id}:${SECRET}`)
    .digest("hex");

async function issue(u, kind = "verify") {
  const code = String(crypto.randomInt(100000, 1000000));
  u.otpHash = hash(u, code, kind);
  u.otpExpires = new Date(Date.now() + 10 * 60e3);
  u.otpSentAt = new Date();
  u.otpTries = 0;
  await u.save();
  await sendCode(u, code, kind);
}

module.exports = { issue, hash };

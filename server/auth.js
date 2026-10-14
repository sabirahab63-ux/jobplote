const express = require("express"),
  jwt = require("jsonwebtoken"),
  bcrypt = require("bcryptjs");
const { User, Notification } = require("./models");
const { issue, hash } = require("./mail");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const clean = (e) =>
  String(e || "")
    .toLowerCase()
    .trim();
const strongEnough = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const MAIL_ERROR =
  "We could not send the email. Please try again in a few minutes.";

const hits = new Map();
const limit = (max, ms) => (req, res, next) => {
  const k = req.ip + req.path,
    now = Date.now(),
    h = (hits.get(k) || []).filter((t) => now - t < ms);
  if (h.length >= max)
    return res
      .status(429)
      .json({
        error: "Too many attempts. Please wait a minute and try again.",
      });
  h.push(now);
  hits.set(k, h);
  next();
};

const session = (u) => ({
  token: jwt.sign({ id: String(u._id), role: u.role, name: u.name }, SECRET, {
    expiresIn: "7d",
  }),
  user: { id: u.id, name: u.name, role: u.role },
});

// ---------- register + verify email ----------
router.post(
  "/register",
  limit(10, 6e4),
  wrap(async (req, res) => {
    const {
      name = "",
      email = "",
      password = "",
      role,
      company = "",
    } = req.body;
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email))
      return res
        .status(400)
        .json({ error: "Enter your name and a valid email" });
    if (!strongEnough(password))
      return res
        .status(400)
        .json({
          error: "Password needs 8+ characters with letters and numbers",
        });
    if (!["seeker", "recruiter"].includes(role))
      return res.status(400).json({ error: "Choose a valid role" });
    const exists = await User.findOne({ email: clean(email) });
    if (exists && exists.verified !== false)
      return res
        .status(409)
        .json({ error: "This email is already registered" });
    const u = exists || new User({ email: clean(email) });
    Object.assign(u, {
      name: name.trim(),
      role,
      password: await bcrypt.hash(password, 12),
      company: role === "recruiter" ? company.trim() || name.trim() : "",
      verified: false,
    });
    try {
      await issue(u);
    } catch {
      return res.status(503).json({ error: MAIL_ERROR });
    }
    res.json({ needsVerification: true, email: u.email });
  }),
);

router.post(
  "/verify",
  limit(20, 6e4),
  wrap(async (req, res) => {
    const u = await User.findOne({ email: clean(req.body.email) });
    if (!u || !u.otpHash)
      return res.status(400).json({ error: "Request a new code" });
    if (u.otpExpires < new Date() || u.otpTries >= 5)
      return res.status(400).json({ error: "Code expired. Request a new one" });
    if (hash(u, String(req.body.code || "").trim(), "verify") !== u.otpHash) {
      u.otpTries += 1;
      await u.save();
      return res.status(400).json({ error: "Incorrect code" });
    }
    u.verified = true;
    u.otpHash = "";
    u.lastSeen = new Date();
    await u.save();
    await Notification.create({
      userId: u._id,
      title: "Welcome to JobPilot",
      link: "/profile",
      body:
        u.role === "seeker"
          ? "Upload your resume and complete your profile to start applying."
          : "Post your first role and start hiring.",
    });
    res.json(session(u));
  }),
);

router.post(
  "/resend",
  limit(6, 6e4),
  wrap(async (req, res) => {
    const u = await User.findOne({ email: clean(req.body.email) });
    if (u && u.verified === false) {
      if (u.otpSentAt && Date.now() - u.otpSentAt < 30e3)
        return res
          .status(429)
          .json({
            error: "Please wait 30 seconds before requesting another code",
          });
      try {
        await issue(u);
      } catch {
        return res.status(503).json({ error: MAIL_ERROR });
      }
    }
    res.json({ ok: true });
  }),
);

// ---------- forgot + reset password ----------
router.post(
  "/forgot",
  limit(6, 6e4),
  wrap(async (req, res) => {
    const u = await User.findOne({ email: clean(req.body.email) });
    if (u && u.verified !== false) {
      if (u.otpSentAt && Date.now() - u.otpSentAt < 30e3)
        return res
          .status(429)
          .json({
            error: "Please wait 30 seconds before requesting another code",
          });
      try {
        await issue(u, "reset");
      } catch {
        return res.status(503).json({ error: MAIL_ERROR });
      }
    }
    res.json({ ok: true }); // same answer whether or not the email exists
  }),
);

router.post(
  "/reset",
  limit(10, 6e4),
  wrap(async (req, res) => {
    const { email, code = "", password = "" } = req.body;
    if (!strongEnough(password))
      return res
        .status(400)
        .json({
          error: "Password needs 8+ characters with letters and numbers",
        });
    const u = await User.findOne({ email: clean(email) });
    if (!u || !u.otpHash || u.otpExpires < new Date() || u.otpTries >= 5)
      return res.status(400).json({ error: "Code expired. Request a new one" });
    if (hash(u, String(code).trim(), "reset") !== u.otpHash) {
      u.otpTries += 1;
      await u.save();
      return res.status(400).json({ error: "Incorrect code" });
    }
    Object.assign(u, {
      password: await bcrypt.hash(password, 12),
      otpHash: "",
      loginFails: 0,
      lockUntil: null,
    });
    await u.save();
    await Notification.create({
      userId: u._id,
      title: "Password changed",
      link: "/profile",
      body: "Your password was reset. If this was not you, please contact support.",
    });
    res.json({ ok: true });
  }),
);

// ---------- login ----------
router.post(
  "/login",
  limit(15, 6e4),
  wrap(async (req, res) => {
    const u = await User.findOne({ email: clean(req.body.email) });
    if (u?.lockUntil > new Date())
      return res
        .status(429)
        .json({
          error: "Too many failed attempts. Try again in a few minutes.",
        });
    if (
      !u ||
      !(await bcrypt.compare(String(req.body.password || ""), u.password))
    ) {
      if (u) {
        u.loginFails = (u.loginFails || 0) + 1;
        if (u.loginFails >= 5) {
          u.lockUntil = new Date(Date.now() + 15 * 60e3);
          u.loginFails = 0;
        }
        await u.save();
      }
      return res.status(401).json({ error: "Email or password is incorrect" });
    }
    if (u.verified === false) {
      try {
        await issue(u);
      } catch {
        return res.status(503).json({ error: MAIL_ERROR });
      }
      return res
        .status(403)
        .json({
          code: "NOT_VERIFIED",
          error: "Please verify your email. We sent you a new code.",
        });
    }
    u.loginFails = 0;
    u.lastSeen = new Date();
    await u.save();
    res.json(session(u));
  }),
);

module.exports = router;

require("dotenv").config();
const express = require("express"),
  cors = require("cors"),
  jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"),
  mongoose = require("mongoose"),
  multer = require("multer");
const fs = require("fs"),
  path = require("path");
const {
  User,
  Job,
  Application,
  Notification,
  Resume,
  STATUSES,
} = require("./models");
const { CATEGORIES, MODES, CITIES } = require("./data");
const { seedDatabase } = require("./seed");

const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const DAY = 864e5;

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing. Add it to server/.env");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("Set JWT_SECRET in production");
  process.exit(1);
}

// ---------- optional email (SMTP_USER / SMTP_PASS + "npm install nodemailer") ----------
let mailer = null;
try {
  if (process.env.SMTP_USER && process.env.SMTP_PASS)
    mailer = require("nodemailer").createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
} catch {
  console.log('Email is off. Run "npm install nodemailer" to turn it on.');
}
const mail = (u, subject, text) => {
  if (mailer && u && u.notifyEmail !== false)
    mailer
      .sendMail({
        from: `JobPilot <${process.env.SMTP_USER}>`,
        to: u.email,
        subject,
        text,
      })
      .catch(() => {});
};

// ---------- helpers ----------
const sign = (u) =>
  jwt.sign({ id: String(u._id), role: u.role, name: u.name }, SECRET, {
    expiresIn: "7d",
  });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const notify = (userId, title, body, link) =>
  Notification.create({ userId, title, body, link });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const okUrl = (v) => !v || /^https?:\/\/\S+$/i.test(v);
const region = (city) =>
  CITIES[city]
    ? CITIES[city][0] === "India"
      ? "India"
      : "International"
    : null;
const km = (a, b, c, e) => {
  const r = Math.PI / 180,
    x =
      Math.sin(((c - a) * r) / 2) ** 2 +
      Math.cos(a * r) * Math.cos(c * r) * Math.sin(((e - b) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};
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
const auth = (roles) => (req, res, next) => {
  try {
    const u = jwt.verify(
      (req.headers.authorization || "").split(" ")[1],
      SECRET,
    );
    if (roles && !roles.includes(u.role))
      return res
        .status(403)
        .json({ error: "You do not have access to this action" });
    req.user = u;
    next();
  } catch {
    res.status(401).json({ error: "Please log in again" });
  }
};
const sendPdf = (res, r) => {
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${(r.name || "resume.pdf").replace(/[^\w.\- ]/g, "_")}"`,
    "Cache-Control": "private, no-store",
  });
  res.send(r.data);
};
const resumeMeta = (r) =>
  r ? { name: r.name, size: r.size, uploadedAt: r.uploadedAt } : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const app = express();
const mongoUri = process.env.MONGODB_URI || "";

console.log("MongoDB URI diagnostic:", {
  present: Boolean(mongoUri),
  startsCorrectly: mongoUri.startsWith("mongodb://") ||
    mongoUri.startsWith("mongodb+srv://"),
  hostname: mongoUri.match(/@([^:/?]+)/)?.[1] || "hostname-not-found",
});
const dbReady = mongoose
 .connect(mongoUri)
  .then(async () => {
    console.log("MongoDB connected");

    if (process.env.AUTO_SEED !== "false") {
      await seedDatabase();
    }
  });
app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true,
  }),
);
app.use(express.json({ limit: "100kb" }));

app.use(async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    res.status(500).json({
      error: "Database connection failed",
    });
  }
});

app.use("/api/auth", require("./auth"));
app.post(
  "/api/ping",
  auth(),
  wrap(async (req, res) => {
    await User.updateOne({ _id: req.user.id }, { lastSeen: new Date() });
    res.json({ ok: true });
  }),
);

// ---------- meta (categories, cities, totals) ----------
app.get(
  "/api/meta",
  wrap(async (req, res) => {
    const [byCat, byCity, total, interns, companies] = await Promise.all([
      Job.aggregate([{ $group: { _id: "$category", n: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: "$city", n: { $sum: 1 } } }]),
      Job.countDocuments(),
      Job.countDocuments({ type: "Internship" }),
      Job.distinct("company"),
    ]);
    const cat = Object.fromEntries(byCat.map((x) => [x._id, x.n])),
      cty = Object.fromEntries(byCity.map((x) => [x._id, x.n]));
    res.json({
      totals: {
        jobs: total,
        internships: interns,
        companies: companies.length,
      },
      categories: CATEGORIES.map((name) => ({ name, count: cat[name] || 0 })),
      cities: Object.entries(CITIES)
        .map(([name, [country]]) => ({
          name,
          country,
          region: country === "India" ? "India" : "International",
          count: cty[name] || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  }),
);

// ---------- auth ----------
app.post(
  "/api/auth/register",
  limit(15, 6e4),
  wrap(async (req, res) => {
    const {
      name = "",
      email = "",
      password = "",
      role,
      company = "",
    } = req.body;
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6)
      return res
        .status(400)
        .json({
          error:
            "Enter your name, a valid email and a password of 6+ characters",
        });
    if (!["seeker", "recruiter"].includes(role))
      return res.status(400).json({ error: "Choose a valid role" });
    if (await User.exists({ email: email.toLowerCase().trim() }))
      return res
        .status(409)
        .json({ error: "This email is already registered" });
    const user = await User.create({
      name,
      email,
      role,
      password: await bcrypt.hash(password, 10),
      company: role === "recruiter" ? company.trim() || name.trim() : "",
      lastSeen: new Date(),
    });
    await notify(
      user._id,
      "Welcome to JobPilot",
      role === "seeker"
        ? "Upload your resume and complete your profile to start applying."
        : "Post your first role and start hiring.",
      "/profile",
    );
    res.json({
      token: sign(user),
      user: { id: user.id, name: user.name, role },
    });
  }),
);

app.post(
  "/api/auth/login",
  limit(15, 6e4),
  wrap(async (req, res) => {
    const { email = "", password = "" } = req.body;
    const u = await User.findOne({ email: email.toLowerCase().trim() });
    if (!u || !(await bcrypt.compare(password, u.password)))
      return res.status(401).json({ error: "Email or password is incorrect" });
    u.lastSeen = new Date();
    await u.save();
    res.json({
      token: sign(u),
      user: { id: u.id, name: u.name, role: u.role },
    });
  }),
);

// ---------- profile ----------
const LIM = {
  name: 80,
  phone: 20,
  city: 60,
  headline: 120,
  bio: 600,
  education: 160,
  linkedin: 300,
  website: 300,
  about: 600,
  company: 80,
};

app.get(
  "/api/me",
  auth(),
  wrap(async (req, res) => {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: "Account not found" });
    const out = { user: u.toJSON() };
    if (u.role === "seeker") {
      const mine = await Application.find({ userId: u._id }).select("status");
      out.resume = resumeMeta(
        await Resume.findOne({ userId: u._id }).select("-data"),
      );
      out.stats = {
        applied: mine.length,
        shortlisted: mine.filter((a) => a.status === "Shortlisted").length,
        hired: mine.filter((a) => a.status === "Hired").length,
      };
    } else {
      const ids = await Job.find({ recruiterId: u._id }).distinct("_id");
      const got = await Application.find({ jobId: { $in: ids } }).select(
        "status",
      );
      out.stats = {
        jobs: ids.length,
        applicants: got.length,
        hired: got.filter((a) => a.status === "Hired").length,
      };
    }
    res.json(out);
  }),
);

app.put(
  "/api/me",
  auth(),
  wrap(async (req, res) => {
    const u = await User.findById(req.user.id),
      b = req.body;
    if (!u) return res.status(404).json({ error: "Account not found" });
    for (const k of ["linkedin", "website"])
      if (typeof b[k] === "string" && !okUrl(b[k].trim()))
        return res
          .status(400)
          .json({ error: "Links must start with http:// or https://" });
    for (const k in LIM)
      if (typeof b[k] === "string") u[k] = b[k].trim().slice(0, LIM[k]);
    if (!u.name) return res.status(400).json({ error: "Name cannot be empty" });
    if (b.skills !== undefined)
      u.skills = (
        Array.isArray(b.skills) ? b.skills : String(b.skills).split(",")
      )
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 15);
    if (typeof b.notifyEmail === "boolean") u.notifyEmail = b.notifyEmail;
    await u.save();
    res.json({ user: u.toJSON() });
  }),
);

app.post(
  "/api/me/password",
  auth(),
  limit(10, 6e4),
  wrap(async (req, res) => {
    const u = await User.findById(req.user.id),
      { current = "", next = "" } = req.body;
    if (!u || !(await bcrypt.compare(current, u.password)))
      return res.status(401).json({ error: "Current password is incorrect" });
    if (next.length < 6)
      return res
        .status(400)
        .json({ error: "New password must be 6+ characters" });
    u.password = await bcrypt.hash(next, 10);
    await u.save();
    res.json({ ok: true });
  }),
);

// ---------- resume (PDF, stored in MongoDB) ----------
app.post(
  "/api/me/resume",
  auth(["seeker"]),
  upload.single("resume"),
  wrap(async (req, res) => {
    const f = req.file;
    if (!f)
      return res.status(400).json({ error: "Choose a PDF file to upload" });
    if (
      f.mimetype !== "application/pdf" ||
      f.buffer.subarray(0, 5).toString() !== "%PDF-"
    )
      return res.status(400).json({ error: "Only PDF files are allowed" });
    const doc = await Resume.findOneAndUpdate(
      { userId: req.user.id },
      {
        name: f.originalname.slice(0, 120),
        size: f.size,
        data: f.buffer,
        uploadedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json({ resume: resumeMeta(doc) });
  }),
);

app.get(
  "/api/me/resume",
  auth(["seeker"]),
  wrap(async (req, res) => {
    const r = await Resume.findOne({ userId: req.user.id });
    if (!r) return res.status(404).json({ error: "No resume uploaded yet" });
    sendPdf(res, r);
  }),
);

app.delete(
  "/api/me/resume",
  auth(["seeker"]),
  wrap(async (req, res) => {
    await Resume.deleteOne({ userId: req.user.id });
    res.json({ ok: true });
  }),
);

// Recruiter sirf unhi applicants ka resume dekh sakta hai jinhone uski job par apply kiya ho
app.get(
  "/api/applications/:id/resume",
  auth(["recruiter"]),
  wrap(async (req, res) => {
    const a = await Application.findById(req.params.id),
      job = a && (await Job.findById(a.jobId));
    if (!job || String(job.recruiterId) !== req.user.id)
      return res.status(404).json({ error: "Application not found" });
    const r = await Resume.findOne({ userId: a.userId });
    if (!r)
      return res.status(404).json({ error: "This applicant has no resume" });
    sendPdf(res, r);
  }),
);

// ---------- jobs ----------
app.get(
  "/api/jobs",
  wrap(async (req, res) => {
    const {
      q = "",
      type = "All",
      category = "All",
      loc = "",
      near = "",
    } = req.query;
    const query = {};
    if (type !== "All") query.type = type;
    if (category !== "All") query.category = category;
    if (loc === "remote") query.mode = "Remote";
    else if (loc === "India" || loc === "International")
      query.city = {
        $in: Object.keys(CITIES).filter((c) => region(c) === loc),
      };
    else if (loc) query.city = String(loc);
    if (String(q).trim()) {
      const rx = new RegExp(esc(String(q).trim()), "i");
      query.$or = [
        { title: rx },
        { company: rx },
        { location: rx },
        { category: rx },
        { skills: rx },
      ];
    }
    const [lat, lng] = String(near).split(",").map(Number),
      here = Number.isFinite(lat) && Number.isFinite(lng);
    let jobs = (await Job.find(query).sort({ createdAt: -1 }).limit(300)).map(
      (j) => j.toJSON(),
    );
    jobs = jobs.map((j) => ({
      ...j,
      distanceKm:
        here && CITIES[j.city]
          ? Math.round(km(lat, lng, CITIES[j.city][1], CITIES[j.city][2]))
          : null,
    }));
    if (here)
      jobs.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
    res.json(jobs);
  }),
);

app.post(
  "/api/jobs",
  auth(["recruiter"]),
  wrap(async (req, res) => {
    const {
      title = "",
      type,
      category,
      city,
      mode,
      pay = "",
      skills,
      description = "",
    } = req.body;
    if (!title.trim() || !description.trim())
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    if (!CATEGORIES.includes(category))
      return res.status(400).json({ error: "Pick a category" });
    const m = MODES.includes(mode) ? mode : "On-site",
      remote = m === "Remote";
    if (!remote && !CITIES[city])
      return res.status(400).json({ error: "Pick a city from the list" });
    const me = await User.findById(req.user.id);
    const job = await Job.create({
      title: title.trim().slice(0, 100),
      type: type === "Job" ? "Job" : "Internship",
      category,
      mode: m,
      city: remote ? "Remote" : city,
      country: remote ? "Remote" : CITIES[city][0],
      location: remote ? "Remote" : `${city}, ${CITIES[city][0]}`,
      pay: String(pay).trim().slice(0, 60),
      skills: (Array.isArray(skills) ? skills : String(skills || "").split(","))
        .map((x) => String(x).trim())
        .filter(Boolean)
        .slice(0, 12),
      description: description.trim().slice(0, 3000),
      company: me?.company || me?.name,
      recruiterId: req.user.id,
    });
    res.json(job);
  }),
);

app.delete(
  "/api/jobs/:id",
  auth(["recruiter"]),
  wrap(async (req, res) => {
    const job = await Job.findById(req.params.id);
    if (!job || String(job.recruiterId) !== req.user.id)
      return res.status(404).json({ error: "Job not found" });
    await Promise.all([
      Job.deleteOne({ _id: job._id }),
      Application.deleteMany({ jobId: job._id }),
    ]);
    res.json({ ok: true });
  }),
);

// ---------- applications ----------
app.post(
  "/api/jobs/:id/apply",
  auth(["seeker"]),
  wrap(async (req, res) => {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!(await Resume.exists({ userId: req.user.id })))
      return res
        .status(400)
        .json({
          code: "RESUME_REQUIRED",
          error: "Please upload your resume (PDF) before applying",
        });
    if (await Application.exists({ jobId: job._id, userId: req.user.id }))
      return res
        .status(409)
        .json({ error: "You already applied to this role" });
    const [me, rec] = await Promise.all([
      User.findById(req.user.id),
      User.findById(job.recruiterId),
    ]);
    const a = await Application.create({
      jobId: job._id,
      userId: me._id,
      coverNote: String(req.body.coverNote || "").slice(0, 1000),
    });
    await Promise.all([
      rec &&
        notify(
          rec._id,
          "New application",
          `${me.name} applied for ${job.title}`,
          "/dashboard",
        ),
      notify(
        me._id,
        "Application sent",
        `Your application for ${job.title} at ${job.company} is in.`,
        "/applications",
      ),
    ]);
    mail(
      rec,
      `New application: ${job.title}`,
      `${me.name} (${me.email}) applied for ${job.title}.\n\n${a.coverNote || "No cover note."}\n\nOpen your dashboard to review the resume.`,
    );
    res.json(a);
  }),
);

app.get(
  "/api/applications/mine",
  auth(["seeker"]),
  wrap(async (req, res) => {
    const apps = await Application.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    const jobs = await Job.find({ _id: { $in: apps.map((a) => a.jobId) } });
    const byId = Object.fromEntries(
      jobs.map((j) => [String(j._id), j.toJSON()]),
    );
    res.json(
      apps
        .map((a) => ({ ...a.toJSON(), job: byId[String(a.jobId)] }))
        .filter((a) => a.job),
    );
  }),
);

app.get(
  "/api/recruiter/overview",
  auth(["recruiter"]),
  wrap(async (req, res) => {
    const jobs = await Job.find({ recruiterId: req.user.id }).sort({
      createdAt: -1,
    });
    const apps = await Application.find({
      jobId: { $in: jobs.map((j) => j._id) },
    }).sort({ createdAt: -1 });
    const users = await User.find({ _id: { $in: apps.map((a) => a.userId) } });
    const withResume = new Set(
      (
        await Resume.find({ userId: { $in: users.map((u) => u._id) } }).select(
          "userId",
        )
      ).map((r) => String(r.userId)),
    );
    const uMap = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const title = Object.fromEntries(jobs.map((j) => [String(j._id), j.title]));

    const applications = apps.map((a) => {
      const u = uMap[String(a.userId)];
      return {
        ...a.toJSON(),
        jobTitle: title[String(a.jobId)],
        applicant: u
          ? {
              name: u.name,
              email: u.email,
              phone: u.phone,
              city: u.city,
              headline: u.headline,
              skills: u.skills,
              education: u.education,
              linkedin: u.linkedin,
              hasResume: withResume.has(String(u._id)),
            }
          : { name: "Deleted user" },
      };
    });

    const days = [...Array(7)].map((_, i) => {
      const t = new Date(Date.now() - (6 - i) * DAY);
      return {
        key: t.toISOString().slice(0, 10),
        label: t.toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC",
        }),
        count: 0,
      };
    });
    applications.forEach((a) => {
      const x = days.find(
        (k) => k.key === new Date(a.createdAt).toISOString().slice(0, 10),
      );
      if (x) x.count++;
    });

    const since = new Date(Date.now() - 12e4);
    const [seekers, recruiters, totalSeekers] = await Promise.all([
      User.countDocuments({ role: "seeker", lastSeen: { $gt: since } }),
      User.countDocuments({ role: "recruiter", lastSeen: { $gt: since } }),
      User.countDocuments({ role: "seeker" }),
    ]);
    res.json({
      jobs: jobs.map((j) => j.toJSON()),
      applications,
      stats: { online: { seekers, recruiters }, totalSeekers, days },
    });
  }),
);

app.patch(
  "/api/applications/:id",
  auth(["recruiter"]),
  wrap(async (req, res) => {
    const a = await Application.findById(req.params.id),
      job = a && (await Job.findById(a.jobId));
    if (!job || String(job.recruiterId) !== req.user.id)
      return res.status(404).json({ error: "Application not found" });
    if (!STATUSES.includes(req.body.status))
      return res.status(400).json({ error: "Invalid status" });
    if (a.status !== req.body.status) {
      a.status = req.body.status;
      await a.save();
      await notify(
        a.userId,
        `Application ${a.status.toLowerCase()}`,
        `${job.company}: your application for ${job.title} is now "${a.status}".`,
        "/applications",
      );
      mail(
        await User.findById(a.userId),
        `Update on your application: ${job.title}`,
        `${job.company} moved your application for ${job.title} to "${a.status}".`,
      );
    }
    res.json(a);
  }),
);

// ---------- notifications ----------
app.get(
  "/api/notifications",
  auth(),
  wrap(async (req, res) => {
    res.json(
      await Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(30),
    );
  }),
);

app.post(
  "/api/notifications/read",
  auth(),
  wrap(async (req, res) => {
    if (!req.body.all && !req.body.id) return res.json({ ok: true });
    await Notification.updateMany(
      { userId: req.user.id, ...(req.body.all ? {} : { _id: req.body.id }) },
      { read: true },
    );
    res.json({ ok: true });
  }),
);

// ---------- serve the built website (after "npm run build") ----------
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
const DIST = path.join(__dirname, "..", "jobplote", "dist");
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get("*", (req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return res
      .status(400)
      .json({
        error:
          err.code === "LIMIT_FILE_SIZE"
            ? "PDF must be under 5 MB"
            : "Upload failed",
      });
  if (err.name === "CastError")
    return res.status(404).json({ error: "Not found" });
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid request" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});


if (require.main === module) {
  dbReady
    .then(() => {
      app.listen(PORT, () => {
        console.log(`JobPlote running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Startup failed:", err.message);
      process.exitCode = 1;
    });
}
module.exports = app;

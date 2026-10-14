require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Job, Application, Notification, Resume } = require('./models');
const { CITIES, BLURB, ROWS } = require('./data');

const DAY = 864e5;

// Chhota demo PDF (sirf demo seekers ke liye)
const demoPdf = (name) => {
  const s = `BT /F1 18 Tf 20 80 Td (${name} - Resume) Tj ET`;
  return Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 150]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n` +
    `4 0 obj<</Length ${s.length}>>stream\n${s}\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n` +
    `trailer<</Root 1 0 R>>\n%%EOF`
  );
};

async function seedDatabase({ reset = false } = {}) {
  if (reset) await Promise.all([User, Job, Application, Notification, Resume].map((m) => m.deleteMany({})));
  if (await User.countDocuments()) return false;

  const pw = bcrypt.hashSync('demo1234', 10), now = Date.now();
  const u = (name, email, role, extra = {}) => ({ name, email, password: pw, role, verified: true, ...extra });

  const recs = await User.insertMany([
    u('Demo Recruiter', 'recruiter@demo.com', 'recruiter', { company: 'Northwind Labs', city: 'Bengaluru', about: 'Product studio building hiring tools for India.' }),
    u('Priya Menon', 'recruiter2@demo.com', 'recruiter', { company: 'Saffron Studio', city: 'Mumbai' }),
    u('Imran Wani', 'recruiter3@demo.com', 'recruiter', { company: 'Lotus Care Group', city: 'Chennai' }),
    u('Anita Rao', 'recruiter4@demo.com', 'recruiter', { company: 'Meridian Group', city: 'Mumbai' }),
  ]);

  const seekers = await User.insertMany([
    ['Aarav Sharma', 'Frontend developer', 'Delhi', 'React,JavaScript'],
    ['Meera Iyer', 'Data analyst', 'Chennai', 'SQL,Excel'],
    ['Kabir Khan', 'Marketing student', 'Srinagar', 'SEO,Canva'],
    ['Sana Bhat', 'Content writer', 'Jammu', 'Writing,Editing'],
    ['Rohan Das', 'HR aspirant', 'Kolkata', 'Recruitment,Communication'],
  ].map(([name, headline, city, skills], i) =>
    u(name, `seeker${i + 1}@demo.com`, 'seeker', { headline, city, skills: skills.split(','), education: 'Final-year student' })));

  await Resume.insertMany(seekers.map((s) => {
    const data = demoPdf(s.name);
    return { userId: s._id, name: `${s.name.replace(/ /g, '_')}_Resume.pdf`, size: data.length, data };
  }));

  const jobs = await Job.insertMany(ROWS.map((row, i) => {
    const [o, title, type, category, company, city, mode, skills, pay] = row.split('|');
    const remote = mode === 'Remote', c = CITIES[city];
    if (!remote && !c) throw new Error('Unknown city in seed: ' + city);
    return {
      title, type, category, company, mode, pay, skills: skills.split(','),
      city: remote ? 'Remote' : city, country: remote ? 'Remote' : c[0], location: remote ? 'Remote' : `${city}, ${c[0]}`,
      description: `${company} is hiring a ${title}. ${BLURB[category]} ${type === 'Internship' ? 'Expect mentorship, a completion certificate and a chance at a full-time offer.' : 'Expect fair pay, learning support and room to grow.'}`,
      recruiterId: recs[+o]._id, createdAt: new Date(now - (i % 14) * DAY - i * 36e5),
    };
  }));

  const mine = jobs.filter((j) => String(j.recruiterId) === String(recs[0]._id));
  const notes = ['I love building clean interfaces and ship fast.', 'Strong with SQL and dashboards. Happy to start soon.', 'Built two full-stack projects with React and Node.', ''];
  const st = ['Applied', 'Shortlisted', 'Hired', 'Rejected', 'Applied', 'Shortlisted', 'Applied', 'Applied'];
  const when = [0.2, 0.5, 1, 1.5, 2, 3, 4, 5];
  await Application.insertMany(st.map((status, i) => ({
    jobId: mine[i % 3]._id, userId: seekers[i % 5]._id, coverNote: notes[i % 4], status, createdAt: new Date(now - when[i] * DAY),
  })));

  await Notification.insertMany([
    { userId: recs[0]._id, title: 'New application', body: `${seekers[0].name} applied for ${mine[0].title}`, link: '/dashboard', createdAt: new Date(now - 0.2 * DAY) },
    { userId: recs[0]._id, title: 'New application', body: `${seekers[1].name} applied for ${mine[1].title}`, link: '/dashboard', createdAt: new Date(now - 0.5 * DAY) },
  ]);
  return true;
}

module.exports = { seedDatabase };

if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => seedDatabase({ reset: process.argv.includes('--reset') }))
    .then((done) => {
      console.log(done ? 'Database seeded: 43 jobs, demo recruiters and seekers ready.' : 'Database already has users, nothing changed. (npm run seed:reset wipes everything and reseeds.)');
      process.exit(0);
    })
    .catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
}
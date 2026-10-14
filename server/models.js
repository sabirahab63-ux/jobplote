const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const STATUSES = ['Applied', 'Shortlisted', 'Rejected', 'Hired'];
const str = { type: String, default: '' };
const opts = {
  versionKey: false,
  toJSON: {
    transform: (_, r) => {
      r.id = String(r._id);
      delete r._id;
      delete r.password;
      delete r.data;
      delete r.otpHash;
      return r;
    },
  },
};

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['seeker', 'recruiter'], required: true },
  phone: str, city: str, headline: str, bio: str, education: str, linkedin: str, website: str, about: str, company: str,
  skills: { type: [String], default: [] },
  notifyEmail: { type: Boolean, default: true },
  lastSeen: { type: Date, default: null },
  verified: { type: Boolean, default: false },
  otpHash: { type: String, default: '' },
  otpExpires: Date,
  otpSentAt: Date,
  otpTries: { type: Number, default: 0 },
  loginFails: { type: Number, default: 0 },
  lockUntil: Date,
  createdAt: { type: Date, default: Date.now },
}, opts));

const Job = model('Job', new Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['Job', 'Internship'], required: true },
  category: { type: String, index: true },
  company: str, city: { type: String, index: true }, country: str, mode: str, location: str, pay: str,
  skills: { type: [String], default: [] },
  description: str,
  recruiterId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, opts));

const appSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  coverNote: str,
  status: { type: String, enum: STATUSES, default: 'Applied' },
  createdAt: { type: Date, default: Date.now },
}, opts);
appSchema.index({ jobId: 1, userId: 1 }, { unique: true });
const Application = model('Application', appSchema);

const Notification = model('Notification', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  title: str, body: str, link: str,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, opts));

const Resume = model('Resume', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  name: str,
  size: { type: Number, default: 0 },
  data: { type: Buffer },
  uploadedAt: { type: Date, default: Date.now },
}, opts));

module.exports = { User, Job, Application, Notification, Resume, STATUSES };
import mongoose from 'mongoose';

const { Schema } = mongoose;
const options = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      delete ret._id;
      delete ret.passwordHash;
      delete ret.verifyTokenHash;
      delete ret.verifyTokenExpires;
      return ret;
    },
  },
};
const ref = (name, extra = {}) => ({ type: Schema.Types.ObjectId, ref: name, ...extra });
const str = (extra = {}) => ({ type: String, trim: true, default: '', ...extra });

export const MONITOR_TYPES = ['http', 'tcp', 'dns'];
export const INTERVALS = [5, 10, 15, 30, 60];

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  demo: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: true }, // true by default so older accounts stay usable
  verifyTokenHash: { type: String, select: false },
  verifyTokenExpires: { type: Date, select: false },
  statusSlug: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
  statusTitle: str(),
}, options);
userSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600, partialFilterExpression: { emailVerified: false } });
export const User = mongoose.model('User', userSchema);

const monitorSchema = new Schema({
  owner: ref('User', { required: true, index: true }),
  name: str({ required: true }),
  type: { type: String, enum: MONITOR_TYPES, required: true },
  url: str(), host: str(), port: { type: Number, default: null }, hostname: str(),
  intervalMinutes: { type: Number, enum: INTERVALS, default: 5 },
  paused: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  alertsEnabled: { type: Boolean, default: true },
  status: { type: String, enum: ['pending', 'up', 'down'], default: 'pending' },
  statusSince: { type: Date, default: Date.now },
  lastCheckedAt: { type: Date, default: null },
  lastLatencyMs: { type: Number, default: null },
  lastStatusCode: { type: Number, default: null },
  lastError: str(),
  consecutiveFailures: { type: Number, default: 0 },
  nextCheckAt: { type: Date, default: Date.now },
}, options);
monitorSchema.index({ paused: 1, nextCheckAt: 1 });
export const Monitor = mongoose.model('Monitor', monitorSchema);

// One row per check. Automatically deleted after 30 days.
const resultSchema = new Schema({
  monitor: ref('Monitor', { required: true }),
  ok: { type: Boolean, required: true },
  latencyMs: { type: Number, default: null },
  statusCode: { type: Number, default: null },
  error: str(),
  checkedAt: { type: Date, default: Date.now },
});
resultSchema.index({ monitor: 1, checkedAt: -1 });
resultSchema.index({ checkedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
export const CheckResult = mongoose.model('CheckResult', resultSchema);

// Automatically deleted after 90 days.
const incidentSchema = new Schema({
  monitor: ref('Monitor', { required: true, index: true }),
  owner: ref('User', { required: true, index: true }),
  startedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  durationSec: { type: Number, default: null },
  reason: str(),
}, options);
incidentSchema.index({ startedAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
export const Incident = mongoose.model('Incident', incidentSchema);

import mongoose from 'mongoose';
import {
  LEAD_HORIZONS,
  LEAD_NEEDS,
  LEAD_OBSTACLES,
  LEAD_PROGRESS,
  LEAD_SOURCES,
  LEAD_STATUS,
  PROJECT_CATEGORIES,
} from '../utils/constants.js';

const budgetSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0 },
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: 'XOF', trim: true },
  },
  { _id: false }
);

const consentSchema = new mongoose.Schema(
  {
    accepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: (value) => value === true,
        message: 'Le consentement est obligatoire',
      },
    },
    acceptedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    city: { type: String, trim: true },

    projectCategory: { type: String, enum: PROJECT_CATEGORIES, required: true },
    projectLocation: { type: String, required: true, trim: true },
    projectTitle: { type: String, trim: true },
    message: { type: String, trim: true, maxlength: 2000 },

    horizon: { type: String, enum: LEAD_HORIZONS, required: true },
    budget: budgetSchema,
    progress: { type: String, enum: LEAD_PROGRESS, required: true },
    needs: {
      type: [{ type: String, enum: LEAD_NEEDS }],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Au moins un besoin est requis',
      },
    },
    obstacles: [{ type: String, enum: LEAD_OBSTACLES }],

    consent: { type: consentSchema, required: true },
    source: { type: String, enum: LEAD_SOURCES, default: 'diagnostic' },
    score: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: LEAD_STATUS, default: 'nouveau', index: true },
    notes: { type: String, trim: true, maxlength: 2000 },

    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    convertedTo: {
      client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    },
    convertedAt: Date,
  },
  { timestamps: true }
);

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ email: 1, createdAt: -1 });

leadSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Lead = mongoose.model('Lead', leadSchema);

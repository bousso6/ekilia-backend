import mongoose from 'mongoose';
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUS,
  PRIORITIES,
} from '../utils/constants.js';

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    advisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    category: { type: String, enum: PROJECT_CATEGORIES, required: true },
    status: { type: String, enum: PROJECT_STATUS, default: 'brouillon', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'normale' },

    location: { type: String, trim: true }, // ville / zone au Sénégal

    progress: {
      value: { type: Number, min: 0, max: 100, default: 0 },
      mode: { type: String, enum: ['auto', 'manuel'], default: 'auto' },
    },

    startDate: Date,
    dueDate: Date,
    closedAt: Date,

    nextAction: {
      label: { type: String, trim: true },
      dueDate: Date,
      owner: { type: String, enum: ['client', 'elikia', 'partenaire'] },
    },

    sourceLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

    satisfaction: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

projectSchema.index({ client: 1, status: 1 });

projectSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Project = mongoose.model('Project', projectSchema);
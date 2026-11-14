import mongoose from 'mongoose';
import { PROJECT_CATEGORIES, PRIORITIES } from '../utils/constants.js';

const templateTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priority: { type: String, enum: PRIORITIES, default: 'normale' },
    isMilestone: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const projectTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, enum: PROJECT_CATEGORIES },
    tasks: { type: [templateTaskSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

projectTemplateSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const ProjectTemplate = mongoose.model(
  'ProjectTemplate',
  projectTemplateSchema
);

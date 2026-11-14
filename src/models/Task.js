import mongoose from 'mongoose';
import { TASK_STATUS, PRIORITIES } from '../utils/constants.js';

const taskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    status: {
      type: String,
      enum: TASK_STATUS,
      default: 'a_faire',
      index: true,
    },
    priority: { type: String, enum: PRIORITIES, default: 'normale' },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    dueDate: Date,
    completedAt: Date,
    isMilestone: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, order: 1 });

taskSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Task = mongoose.model('Task', taskSchema);

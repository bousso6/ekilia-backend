import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const diagnosticFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
    placeholder: { type: String, trim: true },
    options: { type: [optionSchema], default: undefined },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const diagnosticFormSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Pré-diagnostic Elikia',
    },
    version: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    fields: { type: [diagnosticFieldSchema], default: [] },
  },
  { timestamps: true }
);

diagnosticFormSchema.index({ isActive: 1, version: -1 });

diagnosticFormSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const DiagnosticForm = mongoose.model('DiagnosticForm', diagnosticFormSchema);

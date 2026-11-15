import mongoose from 'mongoose';
import { EXPENSE_STATUS } from '../utils/constants.js';

const expenseSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    item: { type: String, required: true, trim: true }, // poste de dépense
    supplier: { type: String, trim: true },

    // Entier en FCFA
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Le montant doit être un entier (en FCFA, sans décimales)',
      },
    },

    date: { type: Date, default: Date.now },
    status: { type: String, enum: EXPENSE_STATUS, default: 'prevu', index: true },

    // Justificatif : référence à un Document (étape B3)
    receipt: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    comment: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

expenseSchema.index({ project: 1, date: -1 });

expenseSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Expense = mongoose.model('Expense', expenseSchema);

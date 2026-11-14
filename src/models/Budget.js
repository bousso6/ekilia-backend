import mongoose from 'mongoose';

const isInteger = {
  validator: Number.isInteger,
  message: 'Le montant doit être un entier (en FCFA, sans décimales)',
};

const revisionSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    previousAmount: { type: Number, required: true, min: 0, validate: isInteger },
    newAmount: { type: Number, required: true, min: 0, validate: isInteger },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    // Un seul budget par projet
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
    },

    // Montants stockés en entiers (FCFA) pour éviter les erreurs d'arrondi
    initialAmount: { type: Number, required: true, min: 0, validate: isInteger },
    revisedAmount: { type: Number, min: 0, validate: isInteger },
    currency: { type: String, default: 'XOF', uppercase: true, trim: true },

    revisions: [revisionSchema],
  },
  { timestamps: true }
);

budgetSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Budget = mongoose.model('Budget', budgetSchema);

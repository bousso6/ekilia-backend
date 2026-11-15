import mongoose from 'mongoose';
import { ASSIGNMENT_STATUS } from '../utils/constants.js';

const partnerAssignmentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },

    // Rôle du partenaire dans ce projet (ex. « Audit du titre foncier »)
    role: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUS,
      default: 'propose',
      index: true,
    },

    // Les coordonnées restent masquées au client tant que c'est faux
    contactRevealed: { type: Boolean, default: false },
    revealedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revealedAt: Date,
  },
  { timestamps: true }
);

partnerAssignmentSchema.index({ project: 1, partner: 1 });

partnerAssignmentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const PartnerAssignment = mongoose.model(
  'PartnerAssignment',
  partnerAssignmentSchema
);

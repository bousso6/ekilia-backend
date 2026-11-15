import mongoose from 'mongoose';
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUS } from '../utils/constants.js';

const versionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, min: 1 },
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: DOCUMENT_CATEGORIES,
      default: 'autre',
      index: true,
    },
    status: {
      type: String,
      enum: DOCUMENT_STATUS,
      default: 'demande',
      index: true,
    },
    dueDate: Date,

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },

    // Un nouveau dépôt ajoute une version, il n'écrase jamais la précédente
    versions: [versionSchema],
  },
  { timestamps: true }
);

documentSchema.index({ project: 1, status: 1 });

documentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    // Les clés de stockage ne sortent jamais de l'API
    if (Array.isArray(ret.versions)) {
      ret.versions = ret.versions.map(({ storageKey, ...rest }) => rest);
    }
    return ret;
  },
});

export const Document = mongoose.model('Document', documentSchema);

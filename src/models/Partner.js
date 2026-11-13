import mongoose from 'mongoose';

export const PARTNER_VERIFICATION_STATUS = ['en_attente', 'verifie', 'suspendu'];

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    contacts: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      address: { type: String, trim: true },
    },

    verificationStatus: {
      type: String,
      enum: PARTNER_VERIFICATION_STATUS,
      default: 'en_attente',
      index: true,
    },

    prestations: [{ type: String, trim: true }],

    // Interne : ne doit JAMAIS être renvoyé à un client
    internalNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

partnerSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Partner = mongoose.model('Partner', partnerSchema);

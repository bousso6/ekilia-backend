import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, trim: true },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ project: 1, createdAt: -1 });

const READ_ONLY_ERROR = "Le journal d'activité est en lecture seule";

activityLogSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error(READ_ONLY_ERROR));
  return next();
});

for (const operation of [
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'deleteMany',
]) {
  activityLogSchema.pre(operation, function (next) {
    next(new Error(READ_ONLY_ERROR));
  });
}

activityLogSchema.pre('deleteOne', { document: false, query: true }, function (next) {
  next(new Error(READ_ONLY_ERROR));
});
activityLogSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  next(new Error(READ_ONLY_ERROR));
});

activityLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

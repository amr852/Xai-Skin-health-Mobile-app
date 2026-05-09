const mongoose = require('mongoose');

const bboxSchema = new mongoose.Schema(
  {
    x1: Number,
    y1: Number,
    x2: Number,
    y2: Number,
    conf: Number,
  },
  { _id: false },
);

const topKSchema = new mongoose.Schema(
  {
    label: String,
    score: Number,
  },
  { _id: false },
);

const diagnosisSchema = new mongoose.Schema(
  {
    label: String,
    score: Number,
    top_k: [topKSchema],
  },
  { _id: false },
);

const scanLesionSchema = new mongoose.Schema(
  {
    lesionId: { type: String, required: true },
    bbox: bboxSchema,
    diagnosis: diagnosisSchema,
    severity: {
      type: String,
      enum: ['urgent', 'check', 'stable'],
    },
    cropImageUrl: String,
    overlayImageUrl: String,
  },
  { _id: false },
);

/**
 * One multi-lesion capture session (aligned with Flask POST /scan-multi).
 */
const scanSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  /** Optional id returned by the Flask service when it persists to Mongo */
  flaskSessionId: { type: String, default: null },
  lesionCount: { type: Number, default: 0 },
  noLesionFound: { type: Boolean, default: false },
  partialFailure: { type: Boolean, default: false },
  qualityMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  originalImageUrl: String,
  annotatedImageUrl: String,
  lesions: [scanLesionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ScanSession', scanSessionSchema);

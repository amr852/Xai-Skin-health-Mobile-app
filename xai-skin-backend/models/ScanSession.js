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
    display: String,
    score: Number,
  },
  { _id: false },
);

const diagnosisSchema = new mongoose.Schema(
  {
    label: String,
    display: String,
    score: Number,
    top_k: [topKSchema],
  },
  { _id: false },
);

const primarySchema = new mongoose.Schema(
  {
    label: String,
    display: String,
    score: Number,
  },
  { _id: false },
);

const specialistSchema = new mongoose.Schema(
  {
    label: String,
    display: String,
    score: Number,
    top_k: [topKSchema],
  },
  { _id: false },
);

const scanLesionSchema = new mongoose.Schema(
  {
    lesionId: { type: String, required: true },
    bbox: bboxSchema,
    primary: primarySchema,
    specialist: specialistSchema,
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
 *
 * `title`, `description`, `location`, and `notes` are optional user-supplied
 * metadata. They let users name a scan ("Mole near left elbow") and add
 * context, instead of the UI relying on the generic auto-derived label.
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
  /** User-editable name shown on history cards (overrides the derived label). */
  title: { type: String, default: '' },
  /** Free-form description (size, shape, colour, observations…). */
  description: { type: String, default: '' },
  /** Body location ("inner left forearm", "back of right ear", …). */
  location: { type: String, default: '' },
  /** Additional notes (sun exposure, tenderness, history, …). */
  notes: { type: String, default: '' },
  lesions: [scanLesionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ScanSession', scanSessionSchema);

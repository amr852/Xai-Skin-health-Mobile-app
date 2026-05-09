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

const analysisLesionItemSchema = new mongoose.Schema(
  {
    lesion_id: String,
    bbox: bboxSchema,
    severity: String,
    cropUrl: String,
    overlayUrl: String,
    diagnosis: {
      label: String,
      score: Number,
    },
  },
  { _id: false },
);

const lesionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: String,
  description: String,
  location: String,
  status: {
    type: String,
    enum: ['Stable','Check' ,'Urgent'],
    default: 'Stable'
  },
  imageUrl: String,
  notes: String,
  analysis: {
    label: String,
    score: Number,
    camImageUrl: String,
    modelName: String,
    predictionIndex: Number,
    xaiMethod: String,
    enhancementsApplied: [String],
    topPredictions: [{
      label: String,
      score: Number,
    }],
    recordId: String,
    severity: String,
    bbox: bboxSchema,
    /** Multi-lesion scan summary (YOLO + per-crop classifier). */
    lesions: [analysisLesionItemSchema],
    lesionCount: Number,
    noLesionFound: Boolean,
    partialFailure: Boolean,
    sessionId: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  dateObserved: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Lesion', lesionSchema);
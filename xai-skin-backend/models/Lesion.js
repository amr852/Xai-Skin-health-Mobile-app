const mongoose = require('mongoose');

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
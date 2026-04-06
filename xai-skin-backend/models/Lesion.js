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
  severity: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    default: 'moderate'
  },
  imageUrl: String,
  notes: String,
  status: {
    type: String,
    enum: ['monitoring', 'improving', 'worsening', 'resolved'],
    default: 'monitoring'
  },
  vitals: {
    temperature: Number,
    humidity: Number,
    uvIndex: Number
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

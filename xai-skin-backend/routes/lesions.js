const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Lesion = require('../models/Lesion');

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:5000';

// ── Image upload setup ──────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `lesion-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Upload lesion image — must be before /:id routes
router.post('/upload-image', verifyToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(200).json({ url: `${baseUrl}/uploads/${req.file.filename}` });
  });
});

async function saveCamImage(base64Data) {
  const cleanBase64 = base64Data.replace(/^data:image\/png;base64,/, '');
  const filename = `cam-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(cleanBase64, 'base64'));
  return filename;
}

async function callModelServer(filePath) {
  const form = new FormData();
  form.append('image', fs.createReadStream(filePath));

  const response = await axios.post(`${MODEL_SERVER_URL}/predict`, form, {
    headers: {
      ...form.getHeaders(),
    },
    timeout: 120000,
  });

  return response.data;
}

// Analyze a lesion image and return prediction + CAM overlay
router.post('/analyze', verifyToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const analysis = await callModelServer(req.file.path);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let camUrl;
      if (analysis?.cam) {
        const camFilename = await saveCamImage(analysis.cam);
        camUrl = `${baseUrl}/uploads/${camFilename}`;
      }

      return res.status(200).json({
        imageUrl: `${baseUrl}/uploads/${req.file.filename}`,
        analysis: {
          label: analysis.label,
          score: analysis.score,
          camImageUrl: camUrl,
          modelName: analysis.modelName,
        },
      });
    } catch (error) {
      console.error('Analyze lesion error:', error?.message || error);
      return res.status(500).json({ error: 'Failed to analyze image' });
    }
  });
});

// Get all lesions for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const lesions = await Lesion.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(lesions);
  } catch (error) {
    console.error('Get lesions error:', error);
    res.status(500).json({ error: 'Failed to fetch lesions' });
  }
});

// Get single lesion
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const lesion = await Lesion.findOne({ _id: req.params.id, userId: req.userId });
    if (!lesion) {
      return res.status(404).json({ error: 'Lesion not found' });
    }
    res.status(200).json(lesion);
  } catch (error) {
    console.error('Get lesion error:', error);
    res.status(500).json({ error: 'Failed to fetch lesion' });
  }
});

// Create new lesion
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, location, status, imageUrl, notes, analysis } = req.body;

    const lesion = new Lesion({
      userId: req.userId,
      title,
      description,
      location,
      status,
      imageUrl,
      notes,
      analysis: analysis ? {
        label: analysis.label,
        score: analysis.score,
        camImageUrl: analysis.camImageUrl,
        modelName: analysis.modelName,
      } : undefined,
    });
    
    await lesion.save();
    res.status(201).json({
      message: 'Lesion recorded successfully',
      lesion
    });
  } catch (error) {
    console.error('Create lesion error:', error);
    res.status(500).json({ error: 'Failed to create lesion' });
  }
});

// Update lesion
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, location, severity, imageUrl, notes, status, vitals } = req.body;
    
    const lesion = await Lesion.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title, description, location, severity, imageUrl, notes, status, vitals, updatedAt: new Date() },
      { new: true }
    );
    
    if (!lesion) {
      return res.status(404).json({ error: 'Lesion not found' });
    }
    
    res.status(200).json({
      message: 'Lesion updated successfully',
      lesion
    });
  } catch (error) {
    console.error('Update lesion error:', error);
    res.status(500).json({ error: 'Failed to update lesion' });
  }
});

// Delete lesion
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const lesion = await Lesion.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    
    if (!lesion) {
      return res.status(404).json({ error: 'Lesion not found' });
    }
    
    res.status(200).json({
      message: 'Lesion deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesion error:', error);
    res.status(500).json({ error: 'Failed to delete lesion' });
  }
});

module.exports = router;

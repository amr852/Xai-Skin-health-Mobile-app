const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Lesion = require('../models/Lesion');
const { verifyToken } = require('../middleware/verifyToken');

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

// Upload lesion image — must be before /:id routes
router.post('/upload-image', verifyToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(200).json({ url: `${baseUrl}/uploads/${req.file.filename}` });
  });
});

function pickAnalysisFields(analysis) {
  if (!analysis || typeof analysis !== 'object') return undefined;
  return {
    label: analysis.label,
    score: analysis.score,
    camImageUrl: analysis.camImageUrl,
    modelName: analysis.modelName,
    predictionIndex: analysis.predictionIndex,
    xaiMethod: analysis.xaiMethod,
    enhancementsApplied: Array.isArray(analysis.enhancementsApplied)
      ? analysis.enhancementsApplied
      : undefined,
    topPredictions: Array.isArray(analysis.topPredictions)
      ? analysis.topPredictions
      : undefined,
    recordId: analysis.recordId,
    severity: analysis.severity,
    bbox: analysis.bbox,
    lesions: Array.isArray(analysis.lesions)
      ? analysis.lesions.map((item) => ({
          lesion_id: item?.lesion_id,
          bbox: item?.bbox,
          severity: item?.severity,
          cropUrl: item?.cropUrl,
          overlayUrl: item?.overlayUrl,
          diagnosis: item?.diagnosis,
        }))
      : undefined,
    lesionCount: typeof analysis.lesionCount === 'number' ? analysis.lesionCount : undefined,
    noLesionFound: typeof analysis.noLesionFound === 'boolean' ? analysis.noLesionFound : undefined,
    partialFailure: typeof analysis.partialFailure === 'boolean' ? analysis.partialFailure : undefined,
    sessionId: analysis.sessionId != null ? String(analysis.sessionId) : undefined,
  };
}

async function saveCamImage(base64Data) {
  const cleanBase64 = base64Data.replace(/^data:image\/png;base64,/, '');
  const filename = `cam-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(cleanBase64, 'base64'));
  return filename;
}

async function callModelServer(filePath, userId, source = 'camera') {
  const form = new FormData();
  form.append('image', fs.createReadStream(filePath));
  if (userId) {
    form.append('userId', String(userId));
  }
  const src = (source || 'camera').toLowerCase();
  form.append('source', src === 'gallery' ? 'gallery' : 'camera');

  const response = await axios.post(`${MODEL_SERVER_URL}/scan-multi`, form, {
    headers: {
      ...form.getHeaders(),
    },
    timeout: 180000,
    /** Large PNG (base64) payloads must not be truncated by axios defaults */
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return response.data;
}

// Analyze a lesion image and return prediction + CAM overlay
router.post('/analyze', verifyToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const source = req.body?.source || 'camera';
      const raw = await callModelServer(req.file.path, req.userId, source);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let camUrl;
      if (raw?.annotated_image_b64) {
        const camFilename = await saveCamImage(raw.annotated_image_b64);
        camUrl = `${baseUrl}/uploads/${camFilename}`;
      } else if (raw?.lesions?.[0]?.overlay_b64) {
        const camFilename = await saveCamImage(raw.lesions[0].overlay_b64);
        camUrl = `${baseUrl}/uploads/${camFilename}`;
      }

      const enhancementsApplied = Array.isArray(raw?.quality_metadata?.enhancements_applied)
        ? raw.quality_metadata.enhancements_applied
        : Array.isArray(raw?.enhancements_applied)
          ? raw.enhancements_applied
          : [];

      // Model identity comes from the model server (additive `model_name`
      // field); fall back to a generic label so the UI never shows a stale arch.
      const modelName = raw?.model_name
        ? `${raw.model_name} + YOLOv12n (Grad-CAM)`
        : 'Lesion classifier + YOLOv12n (Grad-CAM)';

      const first = raw?.lesions?.[0];
      let analysis;
      if (first) {
        analysis = {
          label: first.diagnosis?.label,
          score: typeof first.diagnosis?.score === 'number' ? first.diagnosis.score : 0,
          camImageUrl: camUrl,
          modelName,
          predictionIndex: undefined,
          xaiMethod: 'Grad-CAM',
          enhancementsApplied,
          topPredictions: Array.isArray(first.diagnosis?.top_k)
            ? first.diagnosis.top_k
            : [],
          recordId: raw.session_id || null,
          severity: first.severity,
          bbox: first.bbox,
        };
      } else if (raw?.no_lesion_found) {
        analysis = {
          label: 'No lesion detected',
          score: 0,
          camImageUrl: camUrl,
          modelName,
          predictionIndex: undefined,
          xaiMethod: 'Grad-CAM',
          enhancementsApplied,
          topPredictions: [],
          recordId: raw.session_id || null,
        };
      } else {
        analysis = {
          label: raw?.partial_failure
            ? 'Detection without classification'
            : 'Analysis unavailable',
          score: 0,
          camImageUrl: camUrl,
          modelName,
          predictionIndex: undefined,
          xaiMethod: 'Grad-CAM',
          enhancementsApplied,
          topPredictions: [],
          recordId: raw.session_id || null,
        };
      }

      const lesionsSummary = Array.isArray(raw.lesions)
        ? raw.lesions.map((L) => ({
            lesion_id: L.lesion_id,
            bbox: L.bbox,
            severity: L.severity,
            diagnosis: L.diagnosis
              ? { label: L.diagnosis.label, score: L.diagnosis.score }
              : undefined,
          }))
        : [];

      return res.status(200).json({
        imageUrl: `${baseUrl}/uploads/${req.file.filename}`,
        analysis,
        lesions: lesionsSummary,
        lesionCount: typeof raw.lesion_count === 'number' ? raw.lesion_count : 0,
        noLesionFound: !!raw.no_lesion_found,
        partialFailure: !!raw.partial_failure,
        sessionId: raw.session_id || null,
      });
    } catch (error) {
      const ax = error.response;
      console.error(
        'Analyze lesion error:',
        error?.message || error,
        ax?.status,
        ax?.data,
      );
      if (ax?.status === 500 && ax?.data?.error === 'detection_failed') {
        return res.status(502).json({ error: 'detection_failed' });
      }
      if (ax?.data) {
        const detail =
          typeof ax.data === 'string'
            ? ax.data
            : ax.data.error || ax.data.message || JSON.stringify(ax.data);
        return res.status(502).json({ error: `Model server error: ${detail}` });
      }
      if (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED'
      ) {
        return res.status(502).json({ error: 'Analysis service unavailable' });
      }
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
      analysis: pickAnalysisFields(analysis),
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

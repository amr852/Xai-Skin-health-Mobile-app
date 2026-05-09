const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const ScanSession = require('../models/ScanSession');
const { verifyToken } = require('../middleware/verifyToken');

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:5000';

const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `scan-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function savePngBase64(base64Data, prefix) {
  if (!base64Data || typeof base64Data !== 'string') return null;
  const cleanBase64 = base64Data.replace(/^data:image\/png;base64,/, '');
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, Buffer.from(cleanBase64, 'base64'));
  return filename;
}

async function callScanMulti(filePath, userId, source) {
  const form = new FormData();
  form.append('image', fs.createReadStream(filePath));
  if (userId) form.append('userId', String(userId));
  const src = (source || 'camera').toLowerCase();
  form.append('source', src === 'gallery' ? 'gallery' : 'camera');

  const response = await axios.post(`${MODEL_SERVER_URL}/scan-multi`, form, {
    headers: { ...form.getHeaders() },
    timeout: 180000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return response.data;
}

function publicUploadUrl(req, filename) {
  if (!filename) return null;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${filename}`;
}

/**
 * POST /scan-sessions — run multi-lesion pipeline and persist session + image assets.
 */
router.post('/', verifyToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const source = req.body?.source || 'camera';

    try {
      const raw = await callScanMulti(req.file.path, req.userId, source);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const originalUrl = `${baseUrl}/uploads/${req.file.filename}`;

      if (raw.error) {
        return res.status(502).json({ error: `Model server: ${raw.error}` });
      }

      const annotatedFilename = raw.annotated_image_b64
        ? await savePngBase64(raw.annotated_image_b64, 'annot')
        : null;
      const annotatedImageUrl = publicUploadUrl(req, annotatedFilename);

      const lesionsPayload = [];
      const lesions = Array.isArray(raw.lesions) ? raw.lesions : [];

      for (let i = 0; i < lesions.length; i += 1) {
        const L = lesions[i];
        const cropName = L.crop_b64
          ? await savePngBase64(L.crop_b64, `crop-${i}`)
          : null;
        const overlayName = L.overlay_b64
          ? await savePngBase64(L.overlay_b64, `overlay-${i}`)
          : null;
        lesionsPayload.push({
          lesionId: L.lesion_id,
          bbox: L.bbox,
          diagnosis: L.diagnosis,
          severity: L.severity,
          cropImageUrl: publicUploadUrl(req, cropName),
          overlayImageUrl: publicUploadUrl(req, overlayName),
        });
      }

      const doc = new ScanSession({
        userId: req.userId,
        flaskSessionId: raw.session_id || null,
        lesionCount: typeof raw.lesion_count === 'number' ? raw.lesion_count : lesions.length,
        noLesionFound: !!raw.no_lesion_found,
        partialFailure: !!raw.partial_failure,
        qualityMetadata: raw.quality_metadata || {},
        originalImageUrl: originalUrl,
        annotatedImageUrl,
        lesions: lesionsPayload,
      });
      await doc.save();

      return res.status(201).json({
        _id: doc._id,
        session_id: raw.session_id || null,
        nodeSessionId: String(doc._id),
        lesion_count: doc.lesionCount,
        no_lesion_found: doc.noLesionFound,
        partial_failure: doc.partialFailure,
        annotated_image_b64: null,
        annotatedImageUrl: doc.annotatedImageUrl,
        quality_metadata: doc.qualityMetadata,
        originalImageUrl: doc.originalImageUrl,
        lesions: doc.lesions.map((x) => ({
          lesion_id: x.lesionId,
          bbox: x.bbox,
          diagnosis: x.diagnosis,
          severity: x.severity,
          crop_b64: null,
          overlay_b64: null,
          cropUrl: x.cropImageUrl,
          overlayUrl: x.overlayImageUrl,
        })),
        createdAt: doc.createdAt,
      });
    } catch (error) {
      const ax = error.response;
      console.error(
        'POST /scan-sessions error:',
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
      return res.status(500).json({ error: 'Failed to create scan session' });
    }
  });
});

/** GET /scan-sessions — list current user's sessions */
router.get('/', verifyToken, async (req, res) => {
  try {
    const sessions = await ScanSession.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(sessions);
  } catch (error) {
    console.error('GET /scan-sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch scan sessions' });
  }
});

/** GET /scan-sessions/:id — single session */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const session = await ScanSession.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).lean();
    if (!session) {
      return res.status(404).json({ error: 'Scan session not found' });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error('GET /scan-sessions/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch scan session' });
  }
});

module.exports = router;

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
const SOFT_CONTAINMENT_THRESHOLD = 0.85;
const AGGREGATE_CONTAINER_MIN_CHILDREN = 2;
const AGGREGATE_CONTAINER_MAX_CHILD_AREA_RATIO = 0.4;
const DISTINCT_CHILD_OVERLAP_THRESHOLD = 0.85;

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

function bboxArea(box) {
  if (!box) return 0;
  const w = Math.max(0, Number(box.x2) - Number(box.x1));
  const h = Math.max(0, Number(box.y2) - Number(box.y1));
  return w * h;
}

function bboxIntersectionArea(a, b) {
  if (!a || !b) return 0;
  const w = Math.max(0, Math.min(Number(a.x2), Number(b.x2)) - Math.max(Number(a.x1), Number(b.x1)));
  const h = Math.max(0, Math.min(Number(a.y2), Number(b.y2)) - Math.max(Number(a.y1), Number(b.y1)));
  return w * h;
}

function smallerBoxOverlapRatio(a, b) {
  const smallerArea = Math.min(bboxArea(a), bboxArea(b));
  if (smallerArea <= 0) return 0;
  return bboxIntersectionArea(a, b) / smallerArea;
}

function bboxSoftContains(outer, inner, threshold = SOFT_CONTAINMENT_THRESHOLD) {
  const innerArea = bboxArea(inner);
  if (innerArea <= 0) return false;
  return bboxIntersectionArea(outer, inner) / innerArea >= threshold;
}

function isAggregateContainer(candidate, boxes) {
  const candidateArea = bboxArea(candidate);
  if (candidateArea <= 0) return false;

  const contained = boxes.filter((box) => box !== candidate && bboxSoftContains(candidate, box));
  const distinctContained = contained.reduce((distinct, box) => {
    const duplicatesExisting = distinct.some(
      (existing) => smallerBoxOverlapRatio(existing, box) >= DISTINCT_CHILD_OVERLAP_THRESHOLD,
    );
    if (!duplicatesExisting) distinct.push(box);
    return distinct;
  }, []);
  if (distinctContained.length < AGGREGATE_CONTAINER_MIN_CHILDREN) return false;

  const containedArea = distinctContained.reduce((sum, box) => sum + bboxArea(box), 0);
  return containedArea / candidateArea <= AGGREGATE_CONTAINER_MAX_CHILD_AREA_RATIO;
}

function dedupeLesionsBySoftContainment(lesions) {
  if (!Array.isArray(lesions) || lesions.length <= 1) return Array.isArray(lesions) ? [...lesions] : [];

  const withBbox = [];
  const withoutBbox = [];
  for (let i = 0; i < lesions.length; i += 1) {
    const lesion = lesions[i];
    if (lesion?.bbox) withBbox.push({ lesion, idx: i });
    else withoutBbox.push(lesion);
  }
  if (withBbox.length <= 1) return [...lesions];

  const allBoxes = withBbox.map(({ lesion }) => lesion.bbox);
  const candidates = withBbox.filter(({ lesion }) => !isAggregateContainer(lesion.bbox, allBoxes));

  candidates.sort((a, b) => {
    const areaDiff = bboxArea(b.lesion.bbox) - bboxArea(a.lesion.bbox);
    if (areaDiff !== 0) return areaDiff;
    const confA = Number(a.lesion?.bbox?.conf || 0);
    const confB = Number(b.lesion?.bbox?.conf || 0);
    if (confB !== confA) return confB - confA;
    return a.idx - b.idx;
  });

  const kept = [];
  for (const candidate of candidates) {
    const redundant = kept.some((k) => bboxSoftContains(k.lesion.bbox, candidate.lesion.bbox));
    if (!redundant) kept.push(candidate);
  }

  kept.sort((a, b) => {
    const dy = Number(a.lesion.bbox.y1) - Number(b.lesion.bbox.y1);
    if (Math.abs(dy) > 1) return dy;
    return Number(a.lesion.bbox.x1) - Number(b.lesion.bbox.x1);
  });

  return [...kept.map((k) => k.lesion), ...withoutBbox];
}

async function removeUploadedFileFromUrl(url) {
  if (!url || typeof url !== 'string') return;
  try {
    let pathname;
    try {
      pathname = new URL(url).pathname;
    } catch {
      pathname = url;
    }
    const fileName = path.basename(pathname);
    if (!fileName) return;
    const absolute = path.join(uploadsDir, fileName);
    if (!absolute.startsWith(uploadsDir)) return;
    await fs.promises.unlink(absolute);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('scanSessions cleanup warning:', error?.message || error);
    }
  }
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

      const wholeImageOverlayFilename = raw.whole_image?.overlay_b64
        ? await savePngBase64(raw.whole_image.overlay_b64, 'whole-overlay')
        : null;
      const wholeImageOverlayUrl = publicUploadUrl(req, wholeImageOverlayFilename);
      const wholeImageDoc = raw.whole_image
        ? {
            primary: raw.whole_image.primary,
            specialist: raw.whole_image.specialist,
            diagnosis: raw.whole_image.diagnosis,
            severity: raw.whole_image.severity,
            overlayImageUrl: wholeImageOverlayUrl,
          }
        : undefined;

      const lesionsPayload = [];
      const lesions = dedupeLesionsBySoftContainment(raw.lesions);

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
          primary: L.primary,
          specialist: L.specialist,
          diagnosis: L.diagnosis,
          severity: L.severity,
          cropImageUrl: publicUploadUrl(req, cropName),
          overlayImageUrl: publicUploadUrl(req, overlayName),
        });
      }

      const doc = new ScanSession({
        userId: req.userId,
        flaskSessionId: raw.session_id || null,
        lesionCount: lesionsPayload.length,
        noLesionFound: !!raw.no_lesion_found,
        partialFailure: !!raw.partial_failure,
        qualityMetadata: raw.quality_metadata || {},
        originalImageUrl: originalUrl,
        annotatedImageUrl,
        wholeImage: wholeImageDoc,
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
        wholeImage: doc.wholeImage || null,
        lesions: doc.lesions.map((x) => ({
          lesion_id: x.lesionId,
          bbox: x.bbox,
          primary: x.primary,
          specialist: x.specialist,
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

/**
 * PATCH /scan-sessions/:id — update user-editable metadata only
 * (title, description, location, notes). Analysis fields are read-only.
 */
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const session = await ScanSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Scan session not found' });
    }
    if (String(session.userId) !== String(req.userId)) {
      return res.status(404).json({ error: 'Scan session not found' });
    }

    const editable = ['title', 'description', 'location', 'notes'];
    let touched = false;
    for (const key of editable) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        const v = req.body[key];
        session[key] = typeof v === 'string' ? v.trim() : '';
        touched = true;
      }
    }
    if (!touched) {
      return res.status(400).json({ error: 'No editable fields supplied' });
    }
    await session.save();

    return res.status(200).json(session.toObject());
  } catch (error) {
    console.error('PATCH /scan-sessions/:id error:', error);
    return res.status(500).json({ error: 'Failed to update scan session' });
  }
});

/** DELETE /scan-sessions/:id — remove one stored session */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const session = await ScanSession.findById(req.params.id).lean();

    if (!session) {
      return res.status(404).json({ error: 'Scan session not found' });
    }
    if (String(session.userId) !== String(req.userId)) {
      return res.status(404).json({ error: 'Scan session not found' });
    }

    await ScanSession.deleteOne({ _id: req.params.id });

    const urlsToDelete = [
      session.originalImageUrl,
      session.annotatedImageUrl,
      session.wholeImage?.overlayImageUrl,
      ...(Array.isArray(session.lesions)
        ? session.lesions.flatMap((x) => [x.cropImageUrl, x.overlayImageUrl])
        : []),
    ];
    await Promise.all(urlsToDelete.map((url) => removeUploadedFileFromUrl(url)));

    return res.status(200).json({ message: 'Scan session deleted successfully' });
  } catch (error) {
    console.error('DELETE /scan-sessions/:id error:', error);
    return res.status(500).json({ error: 'Failed to delete scan session' });
  }
});

module.exports = router;

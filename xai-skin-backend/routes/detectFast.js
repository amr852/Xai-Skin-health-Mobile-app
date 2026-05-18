const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { verifyToken } = require('../middleware/verifyToken');

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:5000';

// In-memory upload — live frames are ephemeral; never touch disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const DETECT_FAST_TIMEOUT_MS = 5000;

/**
 * POST /detect-fast — thin proxy to Flask /detect-fast for the mobile Live mode.
 * Forwards the multipart frame, returns the JSON detector output as-is.
 */
router.post('/', verifyToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const form = new FormData();
      form.append('image', req.file.buffer, {
        filename: req.file.originalname || 'live.jpg',
        contentType: req.file.mimetype || 'image/jpeg',
      });

      const response = await axios.post(`${MODEL_SERVER_URL}/detect-fast`, form, {
        headers: { ...form.getHeaders() },
        timeout: DETECT_FAST_TIMEOUT_MS,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      return res.status(200).json(response.data);
    } catch (error) {
      const ax = error.response;
      if (ax?.data) {
        const detail =
          typeof ax.data === 'string'
            ? ax.data
            : ax.data.error || ax.data.message || JSON.stringify(ax.data);
        return res.status(ax.status || 502).json({ error: detail });
      }
      if (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED'
      ) {
        return res.status(502).json({ error: 'Detection service unavailable' });
      }
      return res.status(500).json({ error: 'detect-fast failed' });
    }
  });
});

module.exports = router;

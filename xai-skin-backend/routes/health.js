var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();

router.get('/', function (_req, res) {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1,
    uptime: process.uptime(),
    ts: new Date().toISOString(),
  });
});

module.exports = router;

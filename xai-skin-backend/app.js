var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var mongoose = require('mongoose');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var lesionsRouter = require('./routes/lesions');
var healthRouter = require('./routes/health');

var app = express();

// MongoDB connection — log loudly on connect/disconnect so dev can diagnose offline state.
var mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xai-skin-health';
mongoose.connection.on('error', function (e) {
  console.error('[mongo] error:', e && e.message ? e.message : e);
});
mongoose.connection.on('disconnected', function () {
  console.warn('[mongo] disconnected');
});
mongoose.connection.once('open', function () {
  console.log('[mongo] connected to', mongoUri);
});
mongoose.connect(mongoUri).catch(function (e) {
  console.error('[mongo] initial connect failed:', e.message);
});

// CORS Configuration — allow all origins so React Native (no Origin header) works
app.use(cors({ origin: true, credentials: true }));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/health', healthRouter);
app.use('/users', usersRouter);
app.use('/lesions', lesionsRouter);

// Global JSON error handler — prevents Express from returning HTML error pages
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

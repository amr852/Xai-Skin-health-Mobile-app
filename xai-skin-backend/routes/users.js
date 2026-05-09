var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/verifyToken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

function signAccessToken(userId) {
  return jwt.sign({ userId, typ: 'access' }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(userId, refreshTokenVersion) {
  return jwt.sign(
    { userId, typ: 'refresh', rv: refreshTokenVersion },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES },
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, gender, dateOfBirth } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const user = new User({ email, password, firstName, lastName, gender, dateOfBirth });
    await user.save();

    const token = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id, user.refreshTokenVersion ?? 0);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id, user.refreshTokenVersion ?? 0);

    res.status(200).json({
      message: 'Login successful',
      token,
      refreshToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

/**
 * Exchange a valid refresh JWT for a new access + refresh pair.
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh expired', code: 'REFRESH_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH' });
    }

    if (decoded.typ !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found', code: 'INVALID_REFRESH' });
    }
    const rv = user.refreshTokenVersion ?? 0;
    if (rv !== decoded.rv) {
      return res.status(401).json({ error: 'Session revoked', code: 'REFRESH_REVOKED' });
    }

    const token = signAccessToken(user._id);
    const newRefresh = signRefreshToken(user._id, rv);

    res.status(200).json({
      token,
      refreshToken: newRefresh,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: error.message || 'Refresh failed' });
  }
});

/** Revoke refresh tokens for this user (call before clearing client storage). */
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $inc: { refreshTokenVersion: 1 } });
    res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch profile' });
  }
});

router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, gender, dateOfBirth, profilePicture } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { firstName, lastName, gender, dateOfBirth, profilePicture, updatedAt: new Date() },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'Profile updated successfully', user: user.toJSON() });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

module.exports = router;
const jwt = require('jsonwebtoken');

/**
 * Express middleware: Bearer JWT, sets req.userId from payload.
 * Rejects missing token, literal "null"/"undefined" strings, expired or invalid JWTs.
 */
function verifyToken(req, res, next) {
  const raw = req.headers.authorization?.split(' ')[1];
  if (!raw || raw === 'null' || raw === 'undefined') {
    return res.status(401).json({ error: 'Token required' });
  }
  try {
    const decoded = jwt.verify(
      raw,
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production',
    );
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { verifyToken };

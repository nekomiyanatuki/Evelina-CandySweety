const ALLOWED_TOKENS = [process.env.MCP_TOKEN || 'changeme'];
const ALLOWED_IPS = process.env.ALLOW_IPS?.split(',') || [];

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const ip = req.ip || req.connection.remoteAddress;

  const validToken = ALLOWED_TOKENS.includes(token);
  const ipAllowed = ALLOWED_IPS.length === 0 || ALLOWED_IPS.includes(ip);

  if (!validToken && !ipAllowed) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = { authMiddleware };

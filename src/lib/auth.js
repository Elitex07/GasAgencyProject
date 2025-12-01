import jwt from 'jsonwebtoken';

export const authenticate = (handler) => async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    return handler(req, res);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const verifyToken = (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    console.log('verifyToken: No auth header');
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded;
  } catch (error) {
    console.log('verifyToken: Verification failed', error.message);
    return null;
  }
};
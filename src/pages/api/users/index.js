import { connectToDatabase } from '../../../lib/mongo';
import { User } from '../../../models/user';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send({ message: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectToDatabase();

    const users = await User.find().select('-password');
    res.status(200).json({ users });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
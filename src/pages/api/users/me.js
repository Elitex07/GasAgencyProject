import { connectToDatabase } from '../../../lib/mongo';
import { User } from '../../../models/user';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).send({ message: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectToDatabase();

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.username = req.body.username || user.username;
    user.address = req.body.address || user.address;
    await user.save();

    res.status(200).json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
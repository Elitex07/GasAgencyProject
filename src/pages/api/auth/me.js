import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../lib/mongo';
import { User } from '../../../models/user';
import { Booking } from '../../../models/booking';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send({ message: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectToDatabase();

    const user = await User.findById(decoded.id).select('-password').populate('bookings');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let allBookings = [];
    if (user.type === 'admin') {
      allBookings = await Booking.find().populate('user');
    }

    res.status(200).json({ user, allBookings });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
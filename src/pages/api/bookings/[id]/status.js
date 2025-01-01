import { connectToDatabase } from '../../../../lib/mongo';
import { Booking } from '../../../../models/booking';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send({ message: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectToDatabase();

    const booking = await Booking.findById(req.query.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.delivered = req.body.delivered;
    await booking.save();

    res.status(200).json({ booking });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
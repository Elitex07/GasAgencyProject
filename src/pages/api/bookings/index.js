import { connectToDatabase } from '../../../lib/mongo';
import { Booking } from '../../../models/booking';
import { User } from '../../../models/user';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send({ message: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectToDatabase();

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const booking = new Booking({
      user: user._id,
      bookedOn: req.body.bookedOn,
    });

    await booking.save();
    user.bookings.push(booking._id);
    await user.save();

    res.status(201).json({ booking });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
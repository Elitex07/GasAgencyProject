import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../lib/mongo';
import { User } from '../../../models/user';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send({ message: 'Method not allowed' });

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    const existingUsername = await User.findOne({ username });
    if (existingUser || existingUsername) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

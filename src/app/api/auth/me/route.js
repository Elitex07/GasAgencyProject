import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { User } from '@/models/user';
import { Booking } from '@/models/booking';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let decoded;

        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findById(decoded.userId).select('-password'); // Exclude password
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        let allBookings = [];
        if (user.type === 'admin') {
            allBookings = await Booking.find({}).populate('user', 'username email address');
        } else {
            allBookings = await Booking.find({ user: user._id });
        }

        return NextResponse.json({ user, allBookings }, { status: 200 });

    } catch (error) {
        console.error('Auth Check Error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}

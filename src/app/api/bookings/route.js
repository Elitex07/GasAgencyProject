import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { Booking } from '@/models/booking';
import { User } from '@/models/user';
import jwt from 'jsonwebtoken';

// Helper to verify token
const verifyToken = (req) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    } catch (error) {
        return null;
    }
};

export async function GET(req) {
    try {
        await connectToDatabase();
        const decoded = verifyToken(req);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        let bookings;
        if (user.type === 'admin') {
            bookings = await Booking.find().populate('user', 'username email').sort({ bookedOn: -1 });
        } else {
            bookings = await Booking.find({ user: decoded.userId }).sort({ bookedOn: -1 });
        }

        return NextResponse.json({ bookings }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDatabase();
        const decoded = verifyToken(req);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { bookedOn } = await req.json();

        // Create new booking with default status 'Pending'
        const newBooking = new Booking({
            user: decoded.userId,
            bookedOn: new Date(bookedOn),
            status: 'Pending'
        });

        await newBooking.save();

        // Add booking to user's history
        await User.findByIdAndUpdate(decoded.userId, { $push: { bookings: newBooking._id } });

        return NextResponse.json({ message: 'Booking created successfully', booking: newBooking }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

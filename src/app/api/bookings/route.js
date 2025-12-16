import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { Booking } from '@/models/booking';
import { User } from '@/models/user';
import { Inventory } from '@/models/inventory';
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

        const { bookedOn, item } = await req.json();



        // Date Validation: Ensure booking is not in the past
        const bookingDate = new Date(bookedOn);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        if (bookingDate < today) {
            return NextResponse.json({ message: 'Bookings cannot be made for past dates.' }, { status: 400 });
        }

        if (!item) {
            return NextResponse.json({ message: 'Item is required' }, { status: 400 });
        }

        // Check and deduct inventory
        const inventoryItem = await Inventory.findOne({ item });
        if (!inventoryItem) {
            return NextResponse.json({ message: 'Item not found' }, { status: 404 });
        }

        if (inventoryItem.quantity <= 0) {
            return NextResponse.json({ message: 'Out of stock' }, { status: 400 });
        }

        inventoryItem.quantity -= 1;
        await inventoryItem.save();

        // Create new booking with default status 'Pending'
        const newBooking = new Booking({
            user: decoded.userId,
            bookedOn: new Date(bookedOn),
            item: item,
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

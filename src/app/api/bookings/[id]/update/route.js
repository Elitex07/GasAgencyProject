import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { Booking } from '@/models/booking';
import jwt from 'jsonwebtoken';

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

export async function PUT(req, { params }) {
    try {
        await connectToDatabase();
        const decoded = verifyToken(req);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { status } = await req.json();

        const validStatuses = ['Pending', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
        }

        const updateData = { status };
        if (status === 'Delivered') {
            updateData.refillDate = new Date();
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedBooking) {
            return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Booking updated', booking: updatedBooking }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

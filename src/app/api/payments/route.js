import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { MeterReading } from '@/models/meterReading';
import { Transaction } from '@/models/transaction';
import { User } from '@/models/user';
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

export async function POST(req) {
    try {
        await connectToDatabase();
        const decoded = verifyToken(req);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { readingId, amount } = await req.json();
        const userId = decoded.userId;

        const reading = await MeterReading.findById(readingId);
        if (!reading) {
            return NextResponse.json({ message: 'Meter reading not found' }, { status: 404 });
        }

        if (reading.status === 'Paid') {
            return NextResponse.json({ message: 'Bill already paid' }, { status: 400 });
        }

        // Create Transaction
        const transaction = new Transaction({
            user: userId,
            type: 'Payment',
            amount: amount,
            referenceModel: 'MeterReading',
            referenceId: readingId,
            status: 'Success'
        });
        await transaction.save();

        // Update Reading Status
        reading.status = 'Paid';
        reading.paid = true; // For backward compatibility
        await reading.save();

        return NextResponse.json({ message: 'Payment successful', transaction }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

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

        let transactions;
        if (user.type === 'admin') {
            transactions = await Transaction.find().populate('user', 'username email').sort({ date: -1 });
        } else {
            transactions = await Transaction.find({ user: decoded.userId }).sort({ date: -1 });
        }

        return NextResponse.json({ transactions }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

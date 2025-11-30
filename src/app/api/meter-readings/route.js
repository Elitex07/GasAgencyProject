import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { MeterReading } from '@/models/meterReading';
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

        let readings;
        if (user.type === 'admin') {
            readings = await MeterReading.find().populate('user', 'username email').sort({ readingDate: -1 });
        } else {
            readings = await MeterReading.find({ user: decoded.userId }).sort({ readingDate: -1 });
        }

        // Calculate Penalties dynamically
        const currentDate = new Date();
        const updatedReadings = await Promise.all(readings.map(async (reading) => {
            if (reading.status === 'Unpaid' && currentDate > new Date(reading.dueDate) && reading.penalty === 0) {
                reading.penalty = 50; // Flat penalty
                await reading.save();
            }
            return reading;
        }));

        return NextResponse.json({ readings: updatedReadings }, { status: 200 });
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

        const { readingValue, readingDate } = await req.json();
        const userId = decoded.userId;

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // Find previous reading to calculate usage
        const lastReading = await MeterReading.findOne({ user: userId }).sort({ readingDate: -1 });

        let usage = 0;
        if (lastReading) {
            usage = readingValue - lastReading.readingValue;
            if (usage < 0) {
                return NextResponse.json({ message: 'New reading cannot be less than previous reading' }, { status: 400 });
            }
        } else {
            // First reading, assume usage is the reading value (or 0 if we want to start from 0)
            usage = readingValue;
        }

        const unitRate = user.pipelineDetails?.unitRate || 45;
        const cost = usage * unitRate;

        // Calculate Due Date (15 days from reading date)
        const dueDate = new Date(readingDate);
        dueDate.setDate(dueDate.getDate() + 15);

        const newReading = new MeterReading({
            user: userId,
            readingDate: new Date(readingDate),
            readingValue,
            usage,
            cost,
            dueDate
        });

        await newReading.save();

        return NextResponse.json({ message: 'Reading submitted successfully', reading: newReading }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

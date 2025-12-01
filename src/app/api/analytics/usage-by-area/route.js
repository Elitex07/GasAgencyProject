import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { MeterReading } from '@/models/meterReading';
import { Booking } from '@/models/booking';
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
        if (!user || user.type !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized: Admin only' }, { status: 403 });
        }

        // Initialize response structure
        const stats = {
            pipeline: {},
            cylinder: {}
        };

        // 1. Process Pipeline Data (from MeterReadings)
        // We need to fetch users with connectionType 'Pipeline' to group them correctly, 
        // but MeterReadings are the source of usage.
        // Actually, let's iterate over MeterReadings and group by the user's area.
        const readings = await MeterReading.find().populate('user', 'address connectionType');

        readings.forEach(reading => {
            if (!reading.user || !reading.user.address) return;

            // Only count if user is currently Pipeline (or if we assume all meter readings are pipeline)
            // It's safer to check connectionType if possible, but historical data might be tricky.
            // For now, we assume MeterReading implies Pipeline usage.

            const area = reading.user.address.area || 'Unknown';

            if (!stats.pipeline[area]) {
                stats.pipeline[area] = { totalUsage: 0, totalCost: 0, customerCount: new Set() };
            }

            stats.pipeline[area].totalUsage += reading.usage;
            stats.pipeline[area].totalCost += reading.cost;
            stats.pipeline[area].customerCount.add(reading.user._id.toString());
        });

        // Convert Set to count
        for (const area in stats.pipeline) {
            stats.pipeline[area].customers = stats.pipeline[area].customerCount.size;
            delete stats.pipeline[area].customerCount;
        }

        // 2. Process Cylinder Data (from Bookings)
        const bookings = await Booking.find({ status: 'Delivered' }).populate('user', 'address connectionType');

        bookings.forEach(booking => {
            if (!booking.user || !booking.user.address) return;

            const area = booking.user.address.area || 'Unknown';

            if (!stats.cylinder[area]) {
                stats.cylinder[area] = { totalBookings: 0, customerCount: new Set() };
            }

            stats.cylinder[area].totalBookings += 1;
            stats.cylinder[area].customerCount.add(booking.user._id.toString());
        });

        // Convert Set to count
        for (const area in stats.cylinder) {
            stats.cylinder[area].customers = stats.cylinder[area].customerCount.size;
            delete stats.cylinder[area].customerCount;
        }

        return NextResponse.json({ stats }, { status: 200 });
    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

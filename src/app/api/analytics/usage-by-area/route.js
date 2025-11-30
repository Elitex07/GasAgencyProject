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
        if (!user || user.type !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized: Admin only' }, { status: 403 });
        }

        // Fetch all readings and populate user address
        const readings = await MeterReading.find().populate('user', 'address');

        const cityStats = {};
        const pincodeStats = {};

        readings.forEach(reading => {
            if (!reading.user || !reading.user.address) return;

            const city = reading.user.address.city || 'Unknown';
            const pincode = reading.user.address.pincode || 'Unknown';

            // Aggregate by City
            if (!cityStats[city]) {
                cityStats[city] = { totalUsage: 0, totalCost: 0, count: 0 };
            }
            cityStats[city].totalUsage += reading.usage;
            cityStats[city].totalCost += reading.cost;
            cityStats[city].count += 1;

            // Aggregate by Pincode
            if (!pincodeStats[pincode]) {
                pincodeStats[pincode] = { totalUsage: 0, totalCost: 0, count: 0 };
            }
            pincodeStats[pincode].totalUsage += reading.usage;
            pincodeStats[pincode].totalCost += reading.cost;
            pincodeStats[pincode].count += 1;
        });

        return NextResponse.json({ cityStats, pincodeStats }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

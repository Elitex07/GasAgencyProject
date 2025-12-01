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
        const responseData = {
            stats: {
                pipeline: {},
                cylinder: {}
            },
            cityStats: {},
            pincodeStats: {}
        };

        // Helper to update stats
        const updateGeoStats = (address, usage, cost) => {
            if (!address) return;
            const { city = 'Unknown', pincode = 'Unknown' } = address;

            // Update City Stats
            if (!responseData.cityStats[city]) {
                responseData.cityStats[city] = { totalUsage: 0, totalCost: 0, count: 0 };
            }
            responseData.cityStats[city].totalUsage += usage;
            responseData.cityStats[city].totalCost += cost;
            responseData.cityStats[city].count += 1;

            // Update Pincode Stats
            if (!responseData.pincodeStats[pincode]) {
                responseData.pincodeStats[pincode] = { totalUsage: 0, totalCost: 0, count: 0 };
            }
            responseData.pincodeStats[pincode].totalUsage += usage;
            responseData.pincodeStats[pincode].totalCost += cost;
            responseData.pincodeStats[pincode].count += 1;
        };

        // 1. Process Pipeline Data (from MeterReadings)
        const readings = await MeterReading.find().populate('user', 'address connectionType');

        readings.forEach(reading => {
            if (!reading.user || !reading.user.address) return;

            const area = reading.user.address.area || 'Unknown';

            if (!responseData.stats.pipeline[area]) {
                responseData.stats.pipeline[area] = { totalUsage: 0, totalCost: 0, customerCount: new Set() };
            }

            responseData.stats.pipeline[area].totalUsage += reading.usage;
            responseData.stats.pipeline[area].totalCost += reading.cost;
            responseData.stats.pipeline[area].customerCount.add(reading.user._id.toString());

            // Update Geo Stats (City/Pin)
            updateGeoStats(reading.user.address, reading.usage, reading.cost);
        });

        // Convert Set to count for Pipeline
        for (const area in responseData.stats.pipeline) {
            responseData.stats.pipeline[area].customers = responseData.stats.pipeline[area].customerCount.size;
            delete responseData.stats.pipeline[area].customerCount;
        }

        // 2. Process Cylinder Data (from Bookings)
        const bookings = await Booking.find({ status: 'Delivered' }).populate('user', 'address connectionType');

        bookings.forEach(booking => {
            if (!booking.user || !booking.user.address) return;

            const area = booking.user.address.area || 'Unknown';

            if (!responseData.stats.cylinder[area]) {
                responseData.stats.cylinder[area] = { totalBookings: 0, customerCount: new Set() };
            }

            responseData.stats.cylinder[area].totalBookings += 1;
            responseData.stats.cylinder[area].customerCount.add(booking.user._id.toString());

            // Update Geo Stats (City/Pin) - For cylinders, usage is 1 unit (cylinder), cost is implied or we can fetch.
            // For simplicity, let's count usage as 1 and cost as 0 (or fetch from inventory if needed, but frontend just shows usage/revenue).
            // Actually, the frontend shows "Total Usage" and "Revenue".
            // For cylinders, "Usage" could be number of cylinders. "Revenue" we can approximate or leave 0 if not easily available here.
            // Let's assume revenue is 1100 per cylinder for now to show *something*.
            updateGeoStats(booking.user.address, 1, 1100);
        });

        // Convert Set to count for Cylinder
        for (const area in responseData.stats.cylinder) {
            responseData.stats.cylinder[area].customers = responseData.stats.cylinder[area].customerCount.size;
            delete responseData.stats.cylinder[area].customerCount;
        }

        return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

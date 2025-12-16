import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { User } from '@/models/user';
import { Booking } from '@/models/booking';
import { Inventory } from '@/models/inventory';
import { MeterReading } from '@/models/meterReading';
import { Transaction } from '@/models/transaction';
import bcrypt from 'bcryptjs';

export async function GET() {
    await connectToDatabase();

    try {
        // 1. Seed Inventory
        const inventoryItems = [
            { item: 'Cylinder_14kg', quantity: 100, costPrice: 800, sellingPrice: 1100 },
            { item: 'Commercial_19kg', quantity: 50, costPrice: 1500, sellingPrice: 2100 },
            { item: 'Pipeline_Unit', quantity: 999999, costPrice: 30, sellingPrice: 45 },
        ];

        for (const item of inventoryItems) {
            await Inventory.findOneAndUpdate(
                { item: item.item },
                { $set: item },
                { upsert: true, new: true }
            );
        }

        // 2. Seed Users
        const hashedPassword = await bcrypt.hash('password123', 10);

        const users = [
            {
                username: 'demo_user',
                email: 'user@demo.com',
                password: hashedPassword,
                type: 'user',
                connectionType: 'Cylinder',
                address: { house: '123', area: 'Downtown', city: 'Demo City', pincode: '110001' }
            },
            {
                username: 'demo_pipeline',
                email: 'pipeline@demo.com',
                password: hashedPassword,
                type: 'user',
                connectionType: 'Pipeline',
                address: { house: '456', area: 'Suburbs', city: 'Pipe Town', pincode: '110002' },
                pipelineDetails: { meterId: 'M-1001', unitRate: 45 }
            },
            {
                username: 'admin',
                email: 'admin@demo.com',
                password: hashedPassword,
                type: 'admin',
                address: { house: 'Admin HQ', area: 'Central', city: 'Control Center', pincode: '000000' }
            }
        ];

        const createdUsers = {};
        for (const u of users) {
            const user = await User.findOneAndUpdate(
                { email: u.email },
                { $set: u },
                { upsert: true, new: true }
            );
            createdUsers[u.username] = user;
        }

        // 3. Seed Bookings & Transactions (Revenue)
        const demoUser = createdUsers['demo_user'];

        // 5 Delivered Cylinders (Paid)
        for (let i = 0; i < 5; i++) {
            const booking = await Booking.create({
                user: demoUser._id,
                item: 'Cylinder_14kg',
                bookedOn: new Date(),
                status: 'Delivered',
                delivered: true,
                deliveryDate: new Date()
            });

            await Transaction.create({
                user: demoUser._id,
                amount: 1100,
                type: 'Payment',
                status: 'Success',
                date: new Date(),
                referenceModel: 'Booking',
                referenceId: booking._id
            });
        }

        // 4. Seed Pipeline Readings & Transactions
        const demoPipeline = createdUsers['demo_pipeline'];

        // 2 Paid Readings
        const readings = [
            { usage: 50, cost: 2250, status: 'Paid' },
            { usage: 60, cost: 2700, status: 'Paid' }
        ];

        for (const r of readings) {
            const reading = await MeterReading.create({
                user: demoPipeline._id,
                readingDate: new Date(),
                readingValue: 100 + r.usage, // Just dummy value
                usage: r.usage,
                cost: r.cost,
                dueDate: new Date(),
                status: r.status
            });

            await Transaction.create({
                user: demoPipeline._id,
                amount: r.cost,
                type: 'Payment',
                status: 'Success',
                date: new Date(),
                referenceModel: 'MeterReading',
                referenceId: reading._id
            });
        }

        // 5. Seed Refund (Need a dummy booking for reference or just create one)
        // Let's create a cancelled booking for the refund
        const cancelledBooking = await Booking.create({
            user: demoUser._id,
            item: 'Cylinder_14kg',
            bookedOn: new Date(),
            status: 'Cancelled'
        });

        await Transaction.create({
            user: demoUser._id,
            amount: 1100,
            type: 'Refund',
            status: 'Success',
            date: new Date(),
            referenceModel: 'Booking',
            referenceId: cancelledBooking._id
        });

        return NextResponse.json({ message: 'Database seeded successfully with financial data!' });

    } catch (error) {
        console.error('Seed Error:', error);
        return NextResponse.json({ message: 'Error seeding database', error: error.message }, { status: 500 });
    }
}

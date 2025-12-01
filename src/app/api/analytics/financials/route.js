import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { Transaction } from '@/models/transaction';
import { MeterReading } from '@/models/meterReading';
import { Booking } from '@/models/booking';
import { Inventory } from '@/models/inventory';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
    await connectToDatabase();
    const user = verifyToken(req);

    if (!user || user.type !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Total Revenue (from successful payments)
        const payments = await Transaction.find({ type: 'Payment', status: 'Success' });
        const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);

        // 2. Total Refunds
        const refunds = await Transaction.find({ type: 'Refund', status: 'Success' });
        const totalRefunds = refunds.reduce((acc, curr) => acc + curr.amount, 0);

        const netRevenue = totalRevenue - totalRefunds;

        // 3. Calculate Costs
        // Fetch all inventory items to get their cost prices
        const inventoryItems = await Inventory.find({});
        const priceMap = {}; // item name -> cost price
        inventoryItems.forEach(inv => {
            priceMap[inv.item] = inv.costPrice;
        });

        // Cost from Bookings (Delivered)
        // We need to fetch bookings to check which item was booked
        const deliveredBookings = await Booking.find({ status: 'Delivered' });
        let totalBookingCost = 0;

        deliveredBookings.forEach(booking => {
            const itemCost = priceMap[booking.item] || 0; // Default to 0 if item not found or no item specified
            totalBookingCost += itemCost;
        });

        // Cost from Pipeline (Total Usage)
        // Assuming 'Pipeline_Unit' is the item name for pipeline usage in inventory, or we use a fixed cost if not tracked there.
        // For now, let's try to find 'Pipeline_Unit' in our price map, or fallback to a default if needed.
        const pipelineUnitCostPrice = priceMap['Pipeline_Unit'] || 0;

        const readings = await MeterReading.find({});
        const totalPipelineUsage = readings.reduce((acc, curr) => acc + curr.usage, 0);
        const totalPipelineCost = totalPipelineUsage * pipelineUnitCostPrice;

        const totalCost = totalBookingCost + totalPipelineCost;

        // 4. Net Profit
        const netProfit = netRevenue - totalCost;

        // 5. Total Dues (Unpaid Bills)
        // Pipeline Unpaid
        const unpaidReadings = await MeterReading.find({ status: 'Unpaid' });
        const pipelineDues = unpaidReadings.reduce((acc, curr) => acc + curr.cost + (curr.penalty || 0), 0);

        // Cylinder Unpaid (Assuming Cash on Delivery is collected immediately, but if we had credit system...)
        // For now, let's assume all 'Delivered' cylinders are paid or handled via cash. 
        // If we want to track unpaid cylinders, we'd need a payment status on Booking.
        // Let's stick to Pipeline Dues for now as that's explicit.
        const totalDues = pipelineDues;


        return NextResponse.json({
            financials: {
                totalRevenue: netRevenue,
                totalCost,
                netProfit,
                totalDues,
                breakdown: {
                    bookingCost: totalBookingCost,
                    pipelineCost: totalPipelineCost,
                    refunds: totalRefunds
                }
            }
        }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: 'Error calculating financials', error: error.message }, { status: 500 });
    }
}

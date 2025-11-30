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

        const user = await User.findById(decoded.userId);
        if (!user || user.type !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized: Admin only' }, { status: 403 });
        }

        const { transactionId } = await req.json();

        const originalTransaction = await Transaction.findById(transactionId);
        if (!originalTransaction) {
            return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
        }

        if (originalTransaction.type !== 'Payment') {
            return NextResponse.json({ message: 'Only payments can be refunded' }, { status: 400 });
        }

        // Create Refund Transaction
        const refundTransaction = new Transaction({
            user: originalTransaction.user,
            type: 'Refund',
            amount: originalTransaction.amount,
            referenceModel: originalTransaction.referenceModel,
            referenceId: originalTransaction.referenceId,
            status: 'Success'
        });
        await refundTransaction.save();

        // Update Reading Status
        if (originalTransaction.referenceModel === 'MeterReading') {
            const reading = await MeterReading.findById(originalTransaction.referenceId);
            if (reading) {
                reading.status = 'Refunded';
                reading.paid = false;
                await reading.save();
            }
        }

        return NextResponse.json({ message: 'Refund processed successfully', transaction: refundTransaction }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

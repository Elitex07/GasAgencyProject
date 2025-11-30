import { Schema, model, models } from 'mongoose';

const TransactionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Payment', 'Refund', 'Penalty'], required: true },
    amount: { type: Number, required: true },
    referenceModel: { type: String, enum: ['MeterReading', 'Booking'], required: true },
    referenceId: { type: Schema.Types.ObjectId, required: true, refPath: 'referenceModel' },
    status: { type: String, enum: ['Success', 'Failed', 'Pending'], default: 'Success' },
    date: { type: Date, default: Date.now }
});

export const Transaction = models.Transaction || model('Transaction', TransactionSchema);

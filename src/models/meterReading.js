import { Schema, model, models } from 'mongoose';

const MeterReadingSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readingDate: { type: Date, required: true },
    readingValue: { type: Number, required: true },
    usage: { type: Number, required: true }, // Calculated from previous reading
    cost: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    penalty: { type: Number, default: 0 },
    status: { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
    paid: { type: Boolean, default: false }, // Keeping for backward compatibility, but status should be primary
    generatedOn: { type: Date, default: Date.now }
});

export const MeterReading = models.MeterReading || model('MeterReading', MeterReadingSchema);

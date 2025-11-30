import { Schema, model, models } from 'mongoose';

const BookingSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    bookedOn: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    refillDate: { type: Date },
    // delivered: { type: Boolean, default: false }, // Deprecated, kept for backward compatibility if needed, but status should be used.
});

export const Booking = models.Booking || model('Booking', BookingSchema);
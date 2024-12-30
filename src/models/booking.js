import { Schema, model, models } from 'mongoose';

const BookingSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    bookedOn: { type: Date, required: true },
    delivered: { type: Boolean, default: false },
    deliveredOn: { type: Date }
});

export const Booking = models.Booking || model('Booking', BookingSchema);
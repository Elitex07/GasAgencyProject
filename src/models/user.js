import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String },
    bookings: [{type: Schema.Types.ObjectId, ref: 'Booking'}],
    type: { type: String, required: true, enum: ['admin', 'user'], default: 'user' }
});

export const User = models.User || model('User', UserSchema);

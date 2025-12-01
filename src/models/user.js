import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: {
        house: { type: String },
        area: { type: String },
        city: { type: String },
        pincode: { type: String }
    },
    bookings: [{ type: Schema.Types.ObjectId, ref: 'Booking' }],
    type: { type: String, required: true, enum: ['admin', 'user'], default: 'user' },
    connectionType: { type: String, enum: ['Cylinder', 'Pipeline'], default: 'Cylinder' },
    pipelineDetails: {
        meterId: { type: String },
        unitRate: { type: Number, default: 45 } // Default rate per unit
    }
});

export const User = models.User || model('User', UserSchema);

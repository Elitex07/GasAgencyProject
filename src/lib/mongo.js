import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI;

let isConnected = false;

export const connectToDatabase = async () => {
    if (isConnected) return;

    if (!MONGO_URI) {
        throw new Error('Please add your Mongo URI to .env.local as MONGODB_URI');
    }

    try {
        const db = await mongoose.connect(MONGO_URI);
        isConnected = db.connections[0].readyState;
    } catch (error) {
        console.error('Error connecting to Database', error);
        throw error;
    }
};

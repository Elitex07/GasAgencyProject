import mongoose from 'mongoose';

const MONGO_URI = process.env.mongo;

if (!MONGO_URI) throw new Error('Please add your Mongo URI to .env.local');

let isConnected = false; // Track connection status.

export const connectToDatabase = async () => {
    if (isConnected) return;

    try {
        const db = await mongoose.connect(MONGO_URI);
        isConnected = db.connections[0].readyState;
    } catch (error) {
        console.error('Error connecting to Database', error);
        throw error;
    }
};

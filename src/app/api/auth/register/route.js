import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { User } from '@/models/user';
import bcrypt from 'bcryptjs';

export async function POST(req) {
    try {
        const body = await req.json();
        console.log('Registration Request Body:', body);
        const { username, email, password, address, connectionType } = body;

        // 1. Validate inputs
        if (!username || !email || !password) {
            return NextResponse.json(
                { message: 'Username, email, and password are required.' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // 2. Check for existing user
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return NextResponse.json(
                { message: 'User with this email or username already exists.' },
                { status: 409 }
            );
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            address: {
                house: address?.house || '',
                city: address?.city || '',
                pincode: address?.pincode || '',
            },
            connectionType: connectionType || 'Cylinder', // Default to Cylinder
            type: 'user', // Default to user
        });

        await newUser.save();

        return NextResponse.json(
            { message: 'User registered successfully.' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Internal server error.', error: error.message },
            { status: 500 }
        );
    }
}

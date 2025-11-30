import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { User } from '@/models/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Fallback for dev

export async function POST(req) {
    try {
        const body = await req.json();
        console.log('Login Request Body:', body);
        const { email, password } = body;

        // 1. Validate inputs
        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required.' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // 2. Find user
        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // 3. Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // 4. Generate Token
        const token = jwt.sign(
            { userId: user._id, email: user.email, type: user.type },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // 5. Return success
        return NextResponse.json(
            {
                message: 'Login successful.',
                token,
                user: {
                    username: user.username,
                    email: user.email,
                    type: user.type,
                    connectionType: user.connectionType,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { message: 'Internal server error.', error: error.message },
            { status: 500 }
        );
    }
}

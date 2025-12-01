import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import { User } from '@/models/user';
import { verifyToken } from '@/lib/auth';

export async function PUT(req, { params }) {
    try {
        await connectToDatabase();
        const user = verifyToken(req);
        if (!user || user.type !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { role } = await req.json();

        if (!['user', 'admin'].includes(role)) {
            return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
        }

        const updatedUser = await User.findByIdAndUpdate(id, { type: role }, { new: true }).select('-password');

        if (!updatedUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User role updated successfully', user: updatedUser }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import {Inventory} from '@/models/inventory';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
    await connectToDatabase();
    const user = verifyToken(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const inventory = await Inventory.find({});
        return NextResponse.json({ inventory }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: 'Error fetching inventory', error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await connectToDatabase();
    const user = verifyToken(req);

    if (!user || user.type !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { item, quantity, costPrice, sellingPrice } = await req.json();

        let inventoryItem = await Inventory.findOne({ item });

        if (inventoryItem) {
            inventoryItem.quantity = quantity !== undefined ? quantity : inventoryItem.quantity;
            inventoryItem.costPrice = costPrice !== undefined ? costPrice : inventoryItem.costPrice;
            inventoryItem.sellingPrice = sellingPrice !== undefined ? sellingPrice : inventoryItem.sellingPrice;
            inventoryItem.lastUpdated = Date.now();
            await inventoryItem.save();
        } else {
            inventoryItem = await Inventory.create({ item, quantity, costPrice, sellingPrice });
        }

        return NextResponse.json({ message: 'Inventory updated', inventoryItem }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: 'Error updating inventory', error: error.message }, { status: 500 });
    }
}

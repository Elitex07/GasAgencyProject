import { Schema, model, models } from 'mongoose';

const InventorySchema = new Schema({
    item: { type: String, required: true, unique: true }, // e.g., 'Cylinder_14kg', 'Pipeline_Unit'
    quantity: { type: Number, default: 0 }, // Current stock for cylinders
    costPrice: { type: Number, required: true }, // Cost per unit/cylinder
    sellingPrice: { type: Number, required: true }, // Selling price per unit/cylinder
    lastUpdated: { type: Date, default: Date.now },
});

export const Inventory = models.Inventory || model('Inventory', InventorySchema);

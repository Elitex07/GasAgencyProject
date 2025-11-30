import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
    item: { type: String, required: true, unique: true }, // e.g., 'Cylinder_14kg', 'Pipeline_Unit'
    quantity: { type: Number, default: 0 }, // Current stock for cylinders
    costPrice: { type: Number, required: true }, // Cost per unit/cylinder
    sellingPrice: { type: Number, required: true }, // Selling price per unit/cylinder
    lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);

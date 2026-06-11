import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  tipo: { type: String, enum: ['admin', 'professional', 'client'], required: true },
  cargo: { type: String } // e.g. "Fisioterapeuta"
}, { timestamps: true });

export default models.User || model('User', UserSchema);

import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  tipo: { type: String, enum: ['admin', 'receptionist', 'professional', 'client'], required: true },
  roles: { type: [String], enum: ['admin', 'receptionist', 'professional', 'client'], default: ['client'] },
  cargo: { type: String }, // e.g. "Fisioterapeuta"
  isTest: { type: Boolean, default: false }
}, { timestamps: true });

if (models.User) {
  delete (models as any).User;
}

export default model('User', UserSchema);


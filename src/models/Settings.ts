import mongoose, { Schema, model, models } from 'mongoose';

const SettingsSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });

export default models.Settings || model('Settings', SettingsSchema);

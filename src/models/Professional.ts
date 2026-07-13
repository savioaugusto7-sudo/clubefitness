import mongoose, { Schema, model, models } from 'mongoose';

const ProfessionalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  nome: { type: String, required: true },
  especialidade: { type: String, required: true },
  registro: { type: String, required: true },
  googleTokens: {
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    tokenExpiry: { type: Date, default: null },
    calendarId: { type: String, default: 'primary' }
  },
  pin: { type: String, default: '1234' }
}, { timestamps: true });

export default models.Professional || model('Professional', ProfessionalSchema);

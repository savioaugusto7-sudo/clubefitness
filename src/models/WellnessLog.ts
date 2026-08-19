import mongoose, { Schema, model, models } from 'mongoose';

const WellnessLogSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional' },
  data: { type: String, required: true }, // formato YYYY-MM-DD
  horario: { type: String, required: true }, // formato HH:MM
  sono: { type: Number, min: 1, max: 10, required: true },
  fadiga: { type: Number, min: 1, max: 10, required: true },
  dorMuscular: { type: Number, min: 1, max: 10, required: true },
  score: { type: Number, min: 3, max: 30, required: true },
  status: { type: String, enum: ['otimo', 'moderado', 'ruim', 'critico'], required: true },
  statusLabel: { type: String, required: true },
  statusColor: { type: String, required: true },
  conduta: { type: String, required: true },
  regrasAtivadas: [{ type: String }]
}, { timestamps: true });

export default models.WellnessLog || model('WellnessLog', WellnessLogSchema);

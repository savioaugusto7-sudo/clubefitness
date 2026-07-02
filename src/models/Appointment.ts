import mongoose, { Schema, model, models } from 'mongoose';

const AppointmentSchema = new Schema({
  data: { type: String, required: true }, // formato YYYY-MM-DD
  horario: { type: String, required: true }, // formato HH:MM
  tipo: { type: String, enum: ['academia', 'consultorio'], required: true },
  servico: { type: String, required: true },
  consumeCredito: { type: Boolean, default: false },
  tipoCredito: { type: String, enum: ['academia', 'massagem', 'emergencia', 'nenhum'], default: 'nenhum' },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  status: { type: String, enum: ['agendado', 'presenca', 'cancelado'], default: 'agendado' }
}, { timestamps: true });

export default models.Appointment || model('Appointment', AppointmentSchema);

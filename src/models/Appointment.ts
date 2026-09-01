import mongoose, { Schema, model, models } from 'mongoose';

const WellnessSchema = new Schema({
  realizado: { type: Boolean, default: false },
  sono: { type: Number, min: 1, max: 10 },
  fadiga: { type: Number, min: 1, max: 10 },
  dorMuscular: { type: Number, min: 1, max: 10 },
  score: { type: Number, min: 3, max: 30 },
  status: { type: String, enum: ['otimo', 'moderado', 'ruim', 'critico'] },
  statusLabel: { type: String },
  statusColor: { type: String },
  conduta: { type: String },
  regrasAtivadas: [{ type: String }],
  dataPreenchimento: { type: String },
  horarioPreenchimento: { type: String },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional' }
}, { _id: false });

const AppointmentSchema = new Schema({
  data: { type: String, required: true }, // formato YYYY-MM-DD
  horario: { type: String, required: true }, // formato HH:MM
  tipo: { type: String, enum: ['academia', 'consultorio', 'dr_albert', 'dr_guilherme'], required: true },
  servico: { type: String, required: true },
  consumeCredito: { type: Boolean, default: false },
  tipoCredito: { type: String, enum: ['academia', 'massagem', 'emergencia', 'consultorio', 'nenhum'], default: 'nenhum' },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  status: { type: String, enum: ['agendado', 'presenca', 'cancelado', 'falta'], default: 'agendado' },
  origemHorarioFixo: { type: Boolean, default: false },
  fixedScheduleId: { type: Schema.Types.ObjectId, ref: 'FixedSchedule', default: null },
  observacoes: { type: String, default: '' },
  observacaoDataHora: { type: Date, default: null },
  finalizado: { type: Boolean, default: false },
  isEmergenciaExtra: { type: Boolean, default: false },
  mesReferencia: { type: String, default: '' }, // formato YYYY-MM
  wellness: { type: WellnessSchema, default: null }
}, { timestamps: true });

export default models.Appointment || model('Appointment', AppointmentSchema);

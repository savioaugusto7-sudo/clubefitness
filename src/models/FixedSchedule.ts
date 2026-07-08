import mongoose, { Schema, model, models } from 'mongoose';

const FixedScheduleSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: false },
  diaSemana: { type: Number, required: true }, // 0 = Sunday, 1 = Monday, etc.
  horario: { type: String, required: true }, // e.g. "08:00"
  servico: { type: String, required: true }, // e.g. "Treino Monitorado"
  dataInicio: { type: String, required: true }, // "YYYY-MM-DD"
  duracaoSemanas: { type: Number, required: false },
  dataFim: { type: String, required: false }
}, { timestamps: true });

export default models.FixedSchedule || model('FixedSchedule', FixedScheduleSchema);

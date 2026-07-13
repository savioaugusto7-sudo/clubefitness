import mongoose, { Schema, model, models } from 'mongoose';

const ActivityLogSchema = new Schema({
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  acao: { type: String, required: true },
  detalhes: { type: String, default: '' },
  origem: { type: String, enum: ['Computador Coletivo', 'Acesso Direto'], required: true }
}, { timestamps: true });

export default models.ActivityLog || model('ActivityLog', ActivityLogSchema);

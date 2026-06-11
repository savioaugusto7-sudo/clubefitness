import mongoose, { Schema, model, models } from 'mongoose';

const ProntuarioSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  data: { type: String, required: true }, // "YYYY-MM-DD"
  conteudo: { type: String, required: true }
}, { timestamps: true });

export default models.Prontuario || model('Prontuario', ProntuarioSchema);

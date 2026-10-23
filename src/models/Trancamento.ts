import mongoose, { Schema, model, models } from 'mongoose';

const TrancamentoSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  contractId: { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
  dataInicio: { type: String, required: true }, // YYYY-MM-DD
  dataFim: { type: String, required: false }, // YYYY-MM-DD
  dataRetorno: { type: String, required: false }, // YYYY-MM-DD
  diasTrancados: { type: Number, required: false },
  semanas: { type: Number, required: true }, // 1, 2, 3, 4 (ou dias / 7)
  creditosTrancados: { type: Number, required: true },
  redistribuicao: [{
    mesAno: { type: String, required: true }, // Formato: YYYY-MM
    creditos: { type: Number, required: true }
  }],
  dataSolicitacao: { type: Date, default: Date.now },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', default: null },
  origem: { type: String, default: 'Direto' }
}, { timestamps: true });

export default models.Trancamento || model('Trancamento', TrancamentoSchema);

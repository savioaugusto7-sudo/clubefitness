import mongoose, { Schema, model, models } from 'mongoose';

const RenewalProposalSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  planoId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  planoNome: { type: String, required: true },
  planoTipo: { type: String, default: 'Mensal' },
  
  // Valores
  valorAnterior: { type: Number, required: true },
  reajustePercentual: { type: Number, default: 5 },
  valorReajustado: { type: Number, required: true },
  frequencia: { type: Number, default: 3 },
  creditosMensais: { type: Number, default: 13 },
  
  // Vigência
  dataFimAnterior: { type: String, required: true },
  dataInicioRenovacao: { type: String, required: true }, // 1 dia após dataFimAnterior
  dataFimCalculada: { type: String, required: true },
  vigenciaMeses: { type: Number, default: 12 },
  isExpired: { type: Boolean, default: false },

  // Escolhas do aluno
  dataPrimeiroVencimento: { type: String, default: '' },
  formaPagamento: { type: String, default: '' },
  parcelas: { type: Number, default: 1 },
  
  // Status
  status: { type: String, default: 'pendente' },
  
  // Clicksign
  clicksignDocKey: { type: String, default: '' },
  clicksignUrl: { type: String, default: '' },
  clicksignStatus: { type: String, default: 'pendente' },
  
  // Auditoria do aceite
  dadosAceite: {
    ip: { type: String, default: '' },
    dataHora: { type: Date, default: null },
    userAgent: { type: String, default: '' },
    nomeAssinante: { type: String, default: '' }
  }
}, { timestamps: true });

export default models.RenewalProposal || model('RenewalProposal', RenewalProposalSchema);

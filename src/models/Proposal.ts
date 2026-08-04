import mongoose, { Schema, model, models } from 'mongoose';

const ProposalSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  planoId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  planoNome: { type: String, required: true },
  planoTipo: { type: String, enum: ['Mensal', 'Anual'], default: 'Mensal' },
  valorAcordado: { type: Number, required: true },
  creditosMensais: { type: Number, required: true },
  frequencia: { type: Number, default: 3 },
  duracao: { type: String, default: 'mensal' },
  valorUnitario: { type: Number, default: 0 },
  vigenciaQtd: { type: Number, default: 1 },
  descontoTipo: { type: String, default: 'percentual' },
  descontoValor: { type: Number, default: 0 },
  observacoesContratuais: { type: String, default: '' },
  unidadeContratada: { type: String, default: '' },

  status: { type: String, enum: ['pendente', 'respondida', 'aceita', 'recusada'], default: 'pendente' },
  formaPagamentoEscolhida: { type: String, default: '' }, // 'pix', 'boleto', 'cartao'
  parcelasEscolhidas: { type: Number, default: 1 },
  valorFinalRecalculado: { type: Number, default: 0 },
  dataVencimentoEscolhida: { type: String, default: '' },
  dadosPreenchidos: {
    telefone: { type: String, default: '' },
    cep: { type: String, default: '' },
    endereco: { type: String, default: '' },
    numero: { type: String, default: '' },
    complemento: { type: String, default: '' },
    bairro: { type: String, default: '' },
    cidade: { type: String, default: '' },
    estado: { type: String, default: '' },
    cpf: { type: String, default: '' }
  }
}, { timestamps: true });

export default models.Proposal || model('Proposal', ProposalSchema);

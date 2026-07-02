import mongoose, { Schema, model, models } from 'mongoose';

const CongelamentoSchema = new Schema({
  dataInicio: { type: String },
  duracaoDias: { type: Number },
  dataFim: { type: String },
  dataSolicitacao: { type: Date, default: Date.now }
}, { _id: false });

const ContractSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  planoId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  planoNome: { type: String, required: true },
  planoTipo: { type: String, enum: ['Mensal', 'Anual'], default: 'Mensal' },
  valorBruto: { type: Number, required: true },
  descontoTipo: { type: String, enum: ['percentual', 'fixo'], default: 'percentual' },
  descontoValor: { type: Number, default: 0 },
  valorLiquido: { type: Number, required: true },
  formaPagamento: { type: String, required: true },
  parcelas: { type: Number, default: 1 },
  dataPrimeiroVencimento: { type: String },
  diaVencimento: { type: Number },
  dataInicio: { type: String, required: true },
  dataFim: { type: String, required: true },
  vigenciaMeses: { type: Number, required: true },
  responsavelVenda: { type: String, default: '' },
  unidadeContratada: { type: String, default: '' },
  observacoesContratuais: { type: String, default: '' },
  frequencia: { type: Number, default: 3 },
  creditosTotal: { type: Number, default: 0 },
  creditosMassagemPorPlano: { type: Number, default: 0 },
  creditosEmergenciaPorPlano: { type: Number, default: 0 },
  servicosInclusos: [{ type: String }],
  beneficiosInclusos: [{ type: String }],
  dataEmissao: { type: Date, default: Date.now },
  usuarioEmissor: { type: String, default: '' },
  status: { type: String, enum: ['pendente', 'assinado', 'cancelado', 'congelado'], default: 'pendente' },
  versao: { type: Number, default: 1 },
  assinaturaNome: { type: String, default: '' },
  assinaturaData: { type: Date },
  contratoTexto: { type: String, default: '' },
  contratoAnexo: { type: String, default: '' },
  clicksignDocKey: { type: String, default: '' },
  clicksignSignerKey: { type: String, default: '' },
  clicksignUrl: { type: String, default: '' },
  clicksignStatus: { type: String, default: 'pendente' },
  asaasPaymentId: { type: String, default: '' },
  asaasInvoiceUrl: { type: String, default: '' },
  asaasBoletoPdf: { type: String, default: '' },
  asaasPixCopyPaste: { type: String, default: '' },
  asaasPixQrCode: { type: String, default: '' },
  asaasBillingStatus: { type: String, default: 'pendente' },
  congelamento: { type: CongelamentoSchema, default: null }
}, { timestamps: true });

export default models.Contract || model('Contract', ContractSchema);

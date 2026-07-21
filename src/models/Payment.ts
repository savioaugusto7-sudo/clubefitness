import mongoose, { Schema, model, models } from 'mongoose';

const PaymentSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  clientNome: { type: String, required: true },
  contractId: { type: Schema.Types.ObjectId, ref: 'Contract' },
  planoNome: { type: String, required: true },
  valor: { type: Number, required: true },
  vencimento: { type: String, required: true }, // formato YYYY-MM-DD
  dataPagamento: { type: String, default: '' },
  status: { type: String, enum: ['Pendente', 'Pago', 'Atrasado', 'Cancelado'], default: 'Pendente' },
  formaPagamento: { type: String, default: 'Dinheiro' },
  asaasPaymentId: { type: String, default: '' }, // se for integrado
  asaasInvoiceUrl: { type: String, default: '' },
  parcelaNumero: { type: Number, default: 1 },
  parcelasTotal: { type: Number, default: 1 },
  observacoes: { type: String, default: '' }
}, { timestamps: true });

export default models.Payment || model('Payment', PaymentSchema);

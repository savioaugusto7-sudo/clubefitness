import mongoose, { Schema, model, models } from 'mongoose';

const FinancialSchema = new Schema({
  descricao: { type: String, required: true },
  categoria: { type: String, required: true },
  valor: { type: Number, required: true },
  vencimento: { type: String, required: true },
  data_pagamento: { type: String, default: '' },
  status: { type: String, enum: ['Pendente', 'Pago', 'Atrasado'], default: 'Pendente' },
  forma_pagamento: { type: String, default: '' },
  observacoes: { type: String, default: '' },
  anexo_url: { type: String, default: '' }
}, { timestamps: true });

export default models.Financial || model('Financial', FinancialSchema);

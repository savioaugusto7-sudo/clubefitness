import mongoose, { Schema, model, models } from 'mongoose';

const FinancialSchema = new Schema({
  descricao: { type: String, required: true },
  categoria: { type: String, required: true },
  tipo_custo: { type: String, enum: ['fixo', 'variavel'], default: 'fixo' },
  centro_custo: { type: String, default: 'operacional' },
  fornecedor: { type: String, default: '' },
  competencia: { type: String, default: '' }, // YYYY-MM
  valor: { type: Number, required: true },
  vencimento: { type: String, required: true },
  data_pagamento: { type: String, default: '' },
  status: { type: String, default: 'Pendente' },
  forma_pagamento: { type: String, default: '' },
  observacoes: { type: String, default: '' },
  anexo_url: { type: String, default: '' },
  recorrente: { type: Boolean, default: false },
  recorrencia_meses: { type: Number, default: 1 }
}, { timestamps: true });

export default models.Financial || model('Financial', FinancialSchema);


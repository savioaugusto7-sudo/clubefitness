import mongoose, { Schema, model, models } from 'mongoose';

const MedicationSchema = new Schema({
  nome: { type: String, required: true },
  categoria: { type: String },
  quantidade: { type: Number, default: 0 },
  unidade: { type: String },
  lote: { type: String },
  validade: { type: String },
  fabricante: { type: String },
  fornecedor: { type: String },
  data_compra: { type: String },
  valor_compra: { type: Number, default: 0 },
  nota_fiscal_url: { type: String, default: '' },
  observacoes: { type: String, default: '' }
}, { timestamps: true });

export default models.Medication || model('Medication', MedicationSchema);

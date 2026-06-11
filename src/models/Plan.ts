import mongoose, { Schema, model, models } from 'mongoose';

const PlanSchema = new Schema({
  nome: { type: String, required: true },
  validadeDias: { type: Number, required: true },
  limiteSessoesAcademia: { type: Number, default: 0 },
  limiteSessoesConsultorio: { type: Number, default: 0 },
  preco: { type: Number, required: true },
  creditosTotal: { type: Number, required: true },
  servicosPermitidos: [{ type: String }]
}, { timestamps: true });

export default models.Plan || model('Plan', PlanSchema);

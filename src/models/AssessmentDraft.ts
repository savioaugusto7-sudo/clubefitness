import mongoose, { Schema, model, models } from 'mongoose';

const AssessmentDraftSchema = new Schema({
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  tipo: { 
    type: String, 
    enum: ['relatorio_fisioterapia', 'avaliacao_fisica', 'teste_forca'], 
    required: true 
  },
  etapaAtual: { type: Number, default: 1 },
  dados: { type: Schema.Types.Mixed, default: () => ({}) },
  savedAt: { type: Date, default: Date.now }
}, { timestamps: true });

AssessmentDraftSchema.index({ profissionalId: 1, clienteId: 1, tipo: 1 }, { unique: true });

export default models.AssessmentDraft || model('AssessmentDraft', AssessmentDraftSchema);

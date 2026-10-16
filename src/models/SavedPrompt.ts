import mongoose, { Schema, model, models } from 'mongoose';

const SavedPromptSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  titulo: { type: String, required: true },
  descricao: { type: String, default: '' },
  prompt: { type: String, required: true },
  categoria: { 
    type: String, 
    enum: ['financeiro', 'retencao', 'grade', 'auditoria', 'inconsistencias', 'geral'], 
    default: 'auditoria' 
  },
  tags: [{ type: String }],
  isDefault: { type: Boolean, default: false },
  ordem: { type: Number, default: 0 }
}, { timestamps: true });

SavedPromptSchema.index({ userId: 1, categoria: 1 });
SavedPromptSchema.index({ userEmail: 1 });

export default models.SavedPrompt || model('SavedPrompt', SavedPromptSchema);

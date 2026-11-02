import mongoose, { Schema, model, models } from 'mongoose';

export interface IScoreAdjustment {
  _id?: string;
  profissionalId: mongoose.Types.ObjectId;
  profissionalNome?: string;
  mesReferencia: string; // YYYY-MM
  tipo: 'abono_ponto' | 'bonus_credito' | 'debito_manual';
  pontos: number; // valor numérico de pontos
  motivo: string;
  registroOrigemId?: string; // ID da batida de ponto ou evento relacionado
  criadoPor?: string;
  criadoPorNome?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ScoreAdjustmentSchema = new Schema({
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  profissionalNome: { type: String, default: '' },
  mesReferencia: { type: String, required: true }, // YYYY-MM
  tipo: {
    type: String,
    enum: ['abono_ponto', 'bonus_credito', 'debito_manual'],
    required: true
  },
  pontos: { type: Number, required: true },
  motivo: { type: String, required: true, trim: true },
  registroOrigemId: { type: String, default: '' },
  criadoPor: { type: String, default: 'admin' },
  criadoPorNome: { type: String, default: 'Administrador' }
}, { timestamps: true });

if (models.ScoreAdjustment) {
  delete (models as any).ScoreAdjustment;
}

export default model('ScoreAdjustment', ScoreAdjustmentSchema);


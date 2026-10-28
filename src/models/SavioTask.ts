import mongoose, { Schema, model, models } from 'mongoose';

export interface ISavioTask {
  _id?: string;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  titulo: string;
  descricao?: string;
  data: string; // Formato YYYY-MM-DD (fuso BR)
  horario?: string; // Formato HH:mm
  prazoFinal?: string; // Formato YYYY-MM-DD
  prioridade: 'alta' | 'media' | 'baixa';
  categoria: 'administrativa' | 'financeira' | 'comercial' | 'operacional' | 'pessoal' | 'personalizada';
  categoriaPersonalizada?: string;
  status: 'a_fazer' | 'em_andamento' | 'concluida';
  lembrete: boolean;
  concluidaEm?: Date | null;
  ordem?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SavioTaskSchema = new Schema<ISavioTask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true, default: 'savioaugusto7@gmail.com', index: true },
    titulo: { type: String, required: true, trim: true },
    descricao: { type: String, default: '' },
    data: { type: String, required: true, index: true },
    horario: { type: String, default: '' },
    prazoFinal: { type: String, default: '' },
    prioridade: {
      type: String,
      enum: ['alta', 'media', 'baixa'],
      default: 'media'
    },
    categoria: {
      type: String,
      enum: ['administrativa', 'financeira', 'comercial', 'operacional', 'pessoal', 'personalizada'],
      default: 'administrativa'
    },
    categoriaPersonalizada: { type: String, default: '' },
    status: {
      type: String,
      enum: ['a_fazer', 'em_andamento', 'concluida'],
      default: 'a_fazer',
      index: true
    },
    lembrete: { type: Boolean, default: true },
    concluidaEm: { type: Date, default: null },
    ordem: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Índices para consultas ultra-rápidas por período e status
SavioTaskSchema.index({ userEmail: 1, data: 1, status: 1 });
SavioTaskSchema.index({ userEmail: 1, status: 1, prazoFinal: 1 });

export default models.SavioTask || model<ISavioTask>('SavioTask', SavioTaskSchema);

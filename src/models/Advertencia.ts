import mongoose, { Schema, model, models } from 'mongoose';

const AdvertenciaSchema = new Schema({
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  pontosDebito: { type: Number, required: true, min: 0.1 },
  descricao: { type: String, required: true, trim: true },
  data: { type: String, required: true }, // YYYY-MM-DD
  mesReferencia: { type: String, required: true }, // YYYY-MM
  criadoPor: { type: String, default: 'admin' },
  criadoPorNome: { type: String, default: 'Administrador' },
  status: { type: String, enum: ['ativa', 'cancelada'], default: 'ativa' },
  motivoCancelamento: { type: String, default: '' },
  canceladoEm: { type: Date, default: null }
}, { timestamps: true });

if (models.Advertencia) {
  delete (models as any).Advertencia;
}

export default model('Advertencia', AdvertenciaSchema);

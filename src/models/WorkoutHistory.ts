import mongoose, { Schema, model, models } from 'mongoose';

const WorkoutHistorySchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: false },
  profissionalNome: { type: stringSchemaOrString(), default: '' },
  motivo: { type: String, default: 'Atualização de ficha' },
  categoriaAlterada: { type: String, default: '' }, // 'fichasMonitorado' | 'fichasLivre' | 'ambas'
  snapshot: {
    fichasMonitorado: { type: Schema.Types.Mixed, default: [] },
    fichasLivre: { type: Schema.Types.Mixed, default: [] }
  }
}, { timestamps: true });

function stringSchemaOrString() {
  return String;
}

export default models.WorkoutHistory || model('WorkoutHistory', WorkoutHistorySchema);

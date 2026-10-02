import mongoose, { Schema, model, models } from 'mongoose';

const WorkoutHistorySchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: false },
  profissionalNome: { type: stringSchemaOrString(), default: '' },
  motivo: { type: String, default: 'Atualização de ficha' },
  categoriaAlterada: { type: String, default: '' }, // 'fichasMonitorado' | 'fichasLivre' | 'ambas'
  sheetId: { type: String, default: '' },
  sheetNome: { type: String, default: '' },
  dataInicio: { type: String, default: '' },
  dataFim: { type: String, default: '' },
  diasCiclo: { type: Number, default: 0 },
  statusCiclo: { type: String, default: 'concluido' }, // 'concluido' | 'arquivado' | 'backup' | 'renovado'
  exerciciosCount: { type: Number, default: 0 },
  volumeKg: { type: Number, default: 0 },
  observacoes: { type: String, default: '' },
  snapshot: {
    fichasMonitorado: { type: Schema.Types.Mixed, default: [] },
    fichasLivre: { type: Schema.Types.Mixed, default: [] }
  }
}, { timestamps: true });

function stringSchemaOrString() {
  return String;
}

export default models.WorkoutHistory || model('WorkoutHistory', WorkoutHistorySchema);

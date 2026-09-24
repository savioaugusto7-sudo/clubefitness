import mongoose, { Schema, model, models } from 'mongoose';

const WorkoutExerciseSchema = new Schema({
  exercicioId: { type: String, required: true },
  series: { type: Number, required: true },
  repeticoes: { type: String, required: true },
  carga: { type: Schema.Types.Mixed, required: true },
  descanso: { type: String, required: true },
  observacao: { type: String, default: '' },
  ritmo: { type: String, default: '' },
  combinaGrupo: { type: String, default: '' },
  unidadeCarga: { type: String, default: '' },
  dropSet: {
    tipo: { type: String, default: 'none' },
    escopo: { type: String, default: 'ultima_serie' },
    drops: [{ type: Number }]
  },
  historicoCargas: [{
    data: { type: String, default: '' },
    carga: { type: Schema.Types.Mixed },
    unidadeCarga: { type: String, default: 'kg' },
    reps: { type: String, default: '' },
    origem: { type: String, default: 'prescricao' }
  }]
});

const WorkoutSheetSchema = new Schema({
  id: { type: String, required: true }, // "A", "B", "C"
  nome: { type: String, required: true },
  ultimaAtualizacao: { type: String, default: '' },
  dataCriacao: { type: String, default: '' },
  validadeDias: { type: Number, required: false }, // 15, 30, 60
  dataInicio: { type: String, default: '' },
  dataExpiracao: { type: String, default: '' },
  observacoesGerais: { type: String, default: '' },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: false },
  profissionalNome: { type: String, default: '' },
  exercicios: [WorkoutExerciseSchema]
});

const ClientWorkoutSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, unique: true },
  fichasMonitorado: [WorkoutSheetSchema],
  fichasLivre: [WorkoutSheetSchema]
}, { timestamps: true });

export default models.ClientWorkout || model('ClientWorkout', ClientWorkoutSchema);

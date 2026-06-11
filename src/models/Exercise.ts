import mongoose, { Schema, model, models } from 'mongoose';

const ExerciseSchema = new Schema({
  nome: { type: String, required: true },
  grupo: { type: String, required: true },
  equipamento: { type: String, required: true },
  instrucoes: { type: String, default: '' },
  gifUrl: { type: String, default: '' }
});

export default models.Exercise || model('Exercise', ExerciseSchema);

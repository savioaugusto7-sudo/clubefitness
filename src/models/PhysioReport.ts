import mongoose, { Schema, model, models } from 'mongoose';

const ConteudoReportSchema = new Schema({
  queixaPrincipal: String,
  avaliacaoPostural: String,
  adm: String, // amplitude de movimento
  dorEscala: Number,
  testes: String,
  evolucao: String,
  conduta: String,
  exercicios: String
}, { _id: false });

const PhysioReportSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  data: { type: String, required: true },
  conteudo: { type: ConteudoReportSchema, required: true },
  anamnese: { type: Schema.Types.Mixed },
  goniometria: { type: Schema.Types.Mixed },
  testesEspeciais: { type: Schema.Types.Mixed },
  termografia: { type: Schema.Types.Mixed },
  testesOrtopedicos: { type: Schema.Types.Mixed },
  pdfName: { type: String },
  tempoGastoSegundos: { type: Number, default: 0 }
}, { timestamps: true });

export default models.PhysioReport || model('PhysioReport', PhysioReportSchema);

import mongoose, { Schema, model, models } from 'mongoose';

const CircunferenciasSchema = new Schema({
  pescoco: Number, ombros: Number, torax: Number, cintura: Number, abdomen: Number, quadril: Number,
  braçoD: Number, braçoE: Number, antebraçoD: Number, antebraçoE: Number,
  coxaD: Number, coxaE: Number, panturrilhaD: Number, panturrilhaE: Number
}, { _id: false });

const DobrasSchema = new Schema({
  peitoral: Number, triceps: Number, subescapular: Number, subaxilar: Number,
  suprailiaca: Number, abdomen: Number, coxa: Number, panturrilha: Number
}, { _id: false });

const GoniometriaSchema = new Schema({
  quadrilFlexao1D: Number, quadrilFlexao1E: Number,
  quadrilFlexao2D: Number, quadrilFlexao2E: Number,
  quadrilRotIntD: Number, quadrilRotIntE: Number,
  quadrilRotExtD: Number, quadrilRotExtE: Number,
  joelhoFlexaoD: Number, joelhoFlexaoE: Number,
  joelhoPopliteoD: Number, joelhoPopliteoE: Number,
  tornozeloDorsi1D: Number, tornozeloDorsi1E: Number,
  tornozeloDorsi2D: Number, tornozeloDorsi2E: Number,
  tornozeloFlexaoPlantarD: Number, tornozeloFlexaoPlantarE: Number,
  ombroRotIntD: Number, ombroRotIntE: Number,
  ombroRotExtD: Number, ombroRotExtE: Number,
  ombroAbducaoD: Number, ombroAbducaoE: Number
}, { _id: false });

const TestesEspeciaisSchema = new Schema({
  oberD: String, oberE: String, thomasD: String, thomasE: String,
  thomasIliopsoasD: Number, thomasIliopsoasE: Number,
  thomasRetofemoralD: Number, thomasRetofemoralE: Number,
  termografia: String,
  yTest: String,
  stepDown: String,
  maigne: String
}, { _id: false });

const DadosMedidosSchema = new Schema({
  idade: Number, peso: Number, altura: Number, sexo: String,
  objetivoPrincipal: String,
  tipoObjetivo: String,
  nivelExperiencia: String,
  freqSemanal: Number,
  objetivoMeses: Number,
  saudeGeral: {
    pressaoArterial: String, sono: String, nutricao: String,
    atividadeFisica: String, medicamentos: String, cirurgias: String, queixas: String
  },
  circunferencias: CircunferenciasSchema,
  dobras: DobrasSchema,
  somaDobras: Number, percentil: Number,
  goniometria: GoniometriaSchema,
  testesEspeciais: TestesEspeciaisSchema,
  flexibilidade: String, postura: String
}, { _id: false });

const ResultadosCalculadosSchema = new Schema({
  imc: Number, imcClassificacao: String, rcq: Number, rcqClassificacao: String,
  percentualGordura: Number, massaMagra: Number, massaGorda: Number
}, { _id: false });

const MetasSchema = new Schema({
  metaGorduraValor: Number, metaGorduraAlvo: Number,
  metaMassaValor: Number, metaMassaAlvo: Number,
  metaCondicionamentoProgresso: Number, metaFlexibilidadeProgresso: Number
}, { _id: false });

const PhysicalAssessmentSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  avaliadorId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  data: { type: String, required: true },
  dadosMedidos: { type: DadosMedidosSchema, required: true },
  resultadosCalculados: { type: ResultadosCalculadosSchema },
  metas: { type: MetasSchema },
  observacoes: { type: String, default: '' },
  pdfName: { type: String },
  pdf_url: { type: String, default: '' }
}, { timestamps: true });

export default models.PhysicalAssessment || model('PhysicalAssessment', PhysicalAssessmentSchema);


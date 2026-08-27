import mongoose, { Schema, model, models } from 'mongoose';

const ClientTestRecordSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  data: { type: String, required: true, index: true }, // YYYY-MM-DD
  tipoTeste: {
    type: String,
    enum: [
      'Y_TEST',
      'STEP_DOWN',
      'GONIOMETRIA',
      'DINAMOMETRIA',
      'THOMAS',
      'OBER',
      'MAIGNE',
      'COMPOSICAO_CORPORAL',
      'PERIMETRIA'
    ],
    required: true,
    index: true
  },
  
  // Raw and structured data for the specific test
  dados: { type: Schema.Types.Mixed, required: true },

  // Standardized metrics calculated from the test
  metricas: {
    scorePrincipal: { type: Number },
    assimetriaPercentual: { type: Number },
    assimetriaAbsoluta: { type: Number },
    deficitLateral: { type: Number },
    ladoDeficitario: { type: String, enum: ['Direito', 'Esquerdo', 'Bilateral', 'Nenhum'], default: 'Nenhum' },
    classificacao: { type: String },
    alertasClinicos: [{
      tipo: { type: String, enum: ['critico', 'atencao', 'normal'] },
      titulo: String,
      descricao: String,
      riscoClinico: String
    }]
  },

  // Comparative with the previous test of the same type (if available)
  comparativoAnterior: {
    testeAnteriorId: { type: Schema.Types.ObjectId, ref: 'ClientTestRecord' },
    dataAnterior: { type: String },
    diferencaScore: { type: Number },
    evolucaoPercentual: { type: Number },
    statusEvolucao: { type: String, enum: ['melhora', 'estavel', 'regressao', 'recuperado', 'alerta'] },
    detalhes: { type: Schema.Types.Mixed }
  },

  origemDocumento: {
    tipo: { type: String, enum: ['PhysicalAssessment', 'PhysioReport', 'StrengthTest', 'Avulso'], default: 'Avulso' },
    documentoId: { type: Schema.Types.ObjectId }
  },

  observacoes: { type: String, default: '' }
}, { timestamps: true });

// Compound indexes for fast retrieval
ClientTestRecordSchema.index({ clienteId: 1, tipoTeste: 1, data: -1 });
ClientTestRecordSchema.index({ clienteId: 1, data: -1 });

export default models.ClientTestRecord || model('ClientTestRecord', ClientTestRecordSchema);

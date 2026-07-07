import mongoose, { Schema, model, models } from 'mongoose';

const StrengthTestSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  data: { type: String, required: true },
  
  // Single-exercise fallback fields (compatibility)
  exercicio: { type: String },
  cargaMax: { type: Number },
  repeticoes: { type: Number, default: 1 },
  
  // Original multi-exercise strength test structures
  exercicios: [{
    nome: { type: String, required: true }, // e.g. "Supino", "Remada", "Rotação Externa", "Rotação Interna", "Abdução"
    carga: { type: Number, required: true },
    reps: { type: Number, default: 1 }
  }],
  analise: {
    riscoOmbro: { type: Boolean, default: false },
    ratios: { type: Map, of: Number } // hold computed ratios for clinical evaluation
  },
  
  // New structured clinical strength tests
  pesoCliente: { type: Number },
  testesRealizados: [{
    articulacao: { type: String, required: true },
    movimento: { type: String, required: true },
    lado: { type: String, required: true }, // "Direito" | "Esquerdo"
    unidade: { type: String, required: true }, // "kgf" | "N"
    valorObtido: { type: Number, required: true },
    tentativas: { type: Number },
    melhorTentativa: { type: Number },
    mediaTentativas: { type: Number },
    forcaN: { type: Number },
    pesoCorporalN: { type: Number },
    pcPercent: { type: Number },
    pctRef: { type: Number },
    classificacao: { type: String }
  }],
  comparativos: [{
    articulacao: { type: String, required: true },
    movimento: { type: String, required: true },
    valorD: { type: Number },
    valorE: { type: Number },
    simetria: { type: Number }, // Índice de Simetria (%)
    deficit: { type: Number }, // Déficit Lateral (%)
    classificacaoSimetria: { type: String } // Excelente, Aceitável, Atenção, Assimetria Relevante
  }],
  
  observacoes: { type: String, default: '' },
  pdfName: { type: String },
  pdfB64: { type: String }, // support binary/b64 exam PDF attachment
  tempoGastoSegundos: { type: Number, default: 0 }
}, { timestamps: true });

export default models.StrengthTest || model('StrengthTest', StrengthTestSchema);

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
  
  observacoes: { type: String, default: '' },
  pdfName: { type: String },
  pdfB64: { type: String } // support binary/b64 exam PDF attachment
}, { timestamps: true });

export default models.StrengthTest || model('StrengthTest', StrengthTestSchema);

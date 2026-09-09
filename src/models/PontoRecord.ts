import mongoose, { Schema, model, models } from 'mongoose';

const PontoRecordSchema = new Schema({
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  profissionalNome: { type: String, required: true },
  data: { type: String, required: true, index: true }, // "YYYY-MM-DD"
  horario: { type: String, required: true }, // "HH:mm:ss"
  tipo: { type: String, enum: ['entrada'], default: 'entrada' },
  
  // Escala e Pontualidade
  horarioEsperado: { type: String, default: '08:00' }, // "HH:mm"
  periodoCobertura: { type: String, default: '' }, // ex: "08:00 - 14:00"
  minutosAtraso: { type: Number, default: 0 }, // Minutos excedentes
  pontosDebito: { type: Number, default: 0 }, // 1 pt por minuto de atraso
  
  // Validação Geográfica
  localizacao: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    distanciaMetros: { type: Number, default: 0 },
    dentroPerimetro: { type: Boolean, default: true }
  },
  
  // Status e Auditoria
  status: { type: String, enum: ['valido', 'justificado', 'abonado'], default: 'valido' },
  justificativaAdmin: { type: String, default: '' },
  dispositivoInfo: { type: String, default: '' }
}, { timestamps: true });

if (models.PontoRecord) {
  delete (models as any).PontoRecord;
}

export default model('PontoRecord', PontoRecordSchema);

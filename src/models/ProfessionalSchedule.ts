import mongoose, { Schema, model, models } from 'mongoose';

const DayScheduleSchema = new Schema({
  ativo: { type: Boolean, default: true }, // true = trabalha / dia com expediente, false = folga fixa
  horarioEntrada: { type: String, default: '08:00' }, // "HH:mm"
  horarioSaida: { type: String, default: '14:00' }, // "HH:mm"
  periodoNome: { type: String, default: 'Manhã' } // "Manhã", "Tarde", "Noite", "Integral"
}, { _id: false });

const FolgaEspecificaSchema = new Schema({
  id: { type: String, required: true },
  data: { type: String, required: true }, // "YYYY-MM-DD"
  motivo: { type: String, default: 'Folga combinada / Férias' }
}, { _id: false });

const ProfessionalScheduleSchema = new Schema({
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true, unique: true, index: true },
  profissionalNome: { type: String, default: '' },
  
  // Escala Semanal: chave 0 (Dom) a 6 (Sáb)
  diasSemana: {
    '0': { type: DayScheduleSchema, default: () => ({ ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Domingo' }) },
    '1': { type: DayScheduleSchema, default: () => ({ ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' }) },
    '2': { type: DayScheduleSchema, default: () => ({ ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' }) },
    '3': { type: DayScheduleSchema, default: () => ({ ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' }) },
    '4': { type: DayScheduleSchema, default: () => ({ ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' }) },
    '5': { type: DayScheduleSchema, default: () => ({ ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' }) },
    '6': { type: DayScheduleSchema, default: () => ({ ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Sábado' }) }
  },

  // Folgas Específicas / Férias / Ausências Programadas
  folgasEspecificas: { type: [FolgaEspecificaSchema], default: [] }
}, { timestamps: true });

if (models.ProfessionalSchedule) {
  delete (models as any).ProfessionalSchedule;
}

export default model('ProfessionalSchedule', ProfessionalScheduleSchema);

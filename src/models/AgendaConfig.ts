import mongoose, { Schema, model, models } from 'mongoose';

const AgendaConfigSchema = new Schema({
  tipo: { type: String, enum: ['academia', 'consultorio', 'servico'], required: true },
  servico: { type: String, default: null },
  horario: { type: String, required: true }, // e.g. "08:00"
  
  // Exclusão / Bloqueio / Adição
  // - 'bloquear' (remove o horário)
  // - 'adicionar' (cria o horário)
  // - 'alterar_capacidade' (muda as vagas)
  acao: { type: String, enum: ['bloquear', 'adicionar', 'alterar_capacidade'], required: true },
  
  // Regra Recorrente (por dia da semana: 0-6) ou Data Específica (YYYY-MM-DD)
  diaSemana: { type: Number, default: null }, // 0 = Domingo, 1 = Segunda, etc.
  dataEspecifica: { type: String, default: null }, // "YYYY-MM-DD"
  
  // Vagas personalizadas
  capacidadePersonalizada: { type: Number, default: null }
}, { timestamps: true });

export default models.AgendaConfig || model('AgendaConfig', AgendaConfigSchema);

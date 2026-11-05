import mongoose, { Schema, model, models } from 'mongoose';

const ClientActivityLogSchema = new Schema({
  clienteId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true, 
    index: true 
  },
  usuarioId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  tipoAcao: { 
    type: String, 
    enum: ['agendou', 'cancelou', 'checkin', 'login', 'wellness', 'trancamento', 'perfil'], 
    required: true, 
    index: true 
  },
  acao: { 
    type: String, 
    required: true 
  },
  detalhes: { 
    type: String, 
    required: true 
  },
  metadata: {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },
    dataHorarioOriginal: { type: String, default: null },
    modalidade: { type: String, default: null },
    profissionalNome: { type: String, default: null },
    motivoCancelamento: { type: String, default: null },
    antecedenciaHoras: { type: Number, default: null },
    isUltimaHora: { type: Boolean, default: false } // Cancelado com < 2h de antecedência
  },
  origem: { 
    type: String, 
    enum: ['App Mobile (PWA)', 'Portal Web', 'Totem / Autoatendimento', 'WhatsApp / Link', 'Painel Administrativo'], 
    default: 'Portal Web' 
  },
  dispositivo: { 
    type: String, 
    default: 'Desktop' 
  },
  ip: { 
    type: String, 
    default: null 
  }
}, { 
  timestamps: true 
});

ClientActivityLogSchema.index({ createdAt: -1 });
ClientActivityLogSchema.index({ clienteId: 1, createdAt: -1 });
ClientActivityLogSchema.index({ tipoAcao: 1, createdAt: -1 });

export default models.ClientActivityLog || model('ClientActivityLog', ClientActivityLogSchema);


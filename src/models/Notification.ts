import mongoose, { Schema, model, models } from 'mongoose';

const NotificationSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Client' },
  tipo: { type: String, required: true },
  mensagem: { type: String, required: true },
  dataCriacao: { type: String, required: true },
  lida: { type: Boolean, default: false }
}, { timestamps: true });

export default models.Notification || model('Notification', NotificationSchema);

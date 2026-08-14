import mongoose, { Schema, model, models } from 'mongoose';

const AiMessageSchema = new Schema({
  role: { type: String, enum: ['user', 'model', 'tool', 'system'], required: true },
  content: { type: String, default: '' },
  toolCalls: [{
    name: { type: String },
    args: { type: Schema.Types.Mixed }
  }],
  toolResults: [{
    name: { type: String },
    result: { type: Schema.Types.Mixed }
  }],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const AiConversationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: 'Usuário' },
  title: { type: String, default: 'Nova Conversa' },
  channel: { type: String, enum: ['dashboard', 'whatsapp'], default: 'dashboard' },
  whatsappNumber: { type: String, default: '' },
  messages: [AiMessageSchema]
}, { timestamps: true });

export default models.AiConversation || model('AiConversation', AiConversationSchema);

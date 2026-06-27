import mongoose, { Schema, model, models } from 'mongoose';

const DadosPessoaisSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String },
  dataNascimento: { type: String },
  sexo: { type: String },
  telefone: { type: String },
  telefoneSecundario: { type: String },
  email: { type: String },
  endereco: { type: String },
  numero: { type: String },
  complemento: { type: String },
  bairro: { type: String },
  cidade: { type: String },
  estado: { type: String },
  cep: { type: String },
  nacionalidade: { type: String, default: 'brasileiro(a)' },
  estadoCivil: { type: String, default: 'solteiro(a)' },
  profissao: { type: String, default: 'autônomo(a)' }
}, { _id: false });

const DadosClinicosSchema = new Schema({
  lesoes: { type: String, default: '' },
  restricoes: { type: String, default: '' },
  medicamentos: { type: String, default: '' },
  historicoClinico: { type: String, default: '' },
  observacoes: { type: String, default: '' }
}, { _id: false });

const DadosComerciaisSchema = new Schema({
  planoId: { type: Schema.Types.ObjectId, ref: 'Plan' },
  vencimento: { type: String },
  frequencia: { type: Number, default: 3 },
  parcelas: { type: Number, default: 1 },
  status: { type: String, enum: ['ativo', 'vencido', 'inativo', 'suspenso', 'cancelado', 'pendente'], default: 'pendente' },
  contrato: { type: String },
  creditosTotal: { type: Number, default: 0 },
  creditosUsados: { type: Number, default: 0 },
  creditosReservados: { type: Number, default: 0 },
  creditosMassagemTotal: { type: Number, default: 1 },
  creditosMassagemUsados: { type: Number, default: 0 },
  creditosMassagemReservados: { type: Number, default: 0 },
  descontoValor: { type: Number, default: 0 },
  descontoTipo: { type: String, default: 'percentual' },
  duracao: { type: String, default: 'mensal' },
  duracaoQtd: { type: Number, default: 1 },
  valorUnitario: { type: Number, default: 0 },
  formaPagamento: { type: String, default: 'pix' },
  creditosUltimoReset: { type: String },
  dataInicio: { type: String },
  responsavelVenda: { type: String, default: '' },
  unidadeContratada: { type: String, default: '' },
  observacoesContratuais: { type: String, default: '' },
  regrasCredito: {
    permiteRolagem: { type: Boolean, default: false },
    diasRetencaoFalta: { type: Number, default: 0 },
    deducaoFaltaAtraso: { type: Number, default: 1 }
  }
}, { _id: false });

const ClientSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  codigo: { type: String },
  cadastroConcluido: { type: Boolean, default: false },
  dadosPessoais: { type: DadosPessoaisSchema, required: true },
  dadosClinicos: { type: DadosClinicosSchema, default: () => ({}) },
  dadosComerciais: { type: DadosComerciaisSchema, default: () => ({}) }
}, { timestamps: true });

export default models.Client || model('Client', ClientSchema);


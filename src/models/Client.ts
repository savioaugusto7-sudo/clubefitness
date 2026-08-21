import mongoose, { Schema, model, models } from 'mongoose';
import Plan from './Plan';

// Ensure Plan is registered for population
const _plan = Plan;

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
}, { _id: false });

const DadosClinicosSchema = new Schema({
  lesoes: { type: String, default: '' },
  restricoes: { type: String, default: '' },
  medicamentos: { type: String, default: '' },
  historicoClinico: { type: String, default: '' },
  observacoes: { type: String, default: '' }
}, { _id: false });

const DadosComerciaisSchema = new Schema({
  asaasCustomerId: { type: String, default: '' },
  planoId: { type: Schema.Types.ObjectId, ref: 'Plan' },
  vencimento: { type: String },
  frequencia: { type: Number, default: 3 },
  parcelas: { type: Number, default: 1 },
  status: { type: String, enum: ['ativo', 'vencido', 'inativo', 'suspenso', 'cancelado', 'pendente', 'lead', 'excluido_anonimizado'], default: 'pendente' },
  contrato: { type: String },
  creditosTotal: { type: Number, default: 0 },
  creditosUsados: { type: Number, default: 0 },
  creditosReservados: { type: Number, default: 0 },
  creditosMassagemTotal: { type: Number, default: 0 },
  creditosMassagemUsados: { type: Number, default: 0 },
  creditosMassagemReservados: { type: Number, default: 0 },
  creditosRecoveryTotal: { type: Number, default: 0 },
  creditosRecoveryUsados: { type: Number, default: 0 },
  creditosRecoveryReservados: { type: Number, default: 0 },
  creditosEmergenciaTotal: { type: Number, default: 0 },
  creditosEmergenciaUsados: { type: Number, default: 0 },
  creditosEmergenciaReservados: { type: Number, default: 0 },
  descontoValor: { type: Number, default: 0 },
  descontoTipo: { type: String, default: 'percentual' },
  duracao: { type: String, default: 'mensal' },
  duracaoQtd: { type: Number, default: 1 },
  valorUnitario: { type: Number, default: 0 },
  formaPagamento: { type: String, default: 'pix' },
  creditosUltimoReset: { type: String },
  dataInicio: { type: String },
  dataPrimeiroVencimento: { type: String },
  criarRecorrenciaMensal: { type: Boolean, default: false },
  recorrenciaMeses: { type: Number, default: 12 },
  recorrenciaVigencia: { type: Boolean, default: false },
  responsavelVenda: { type: String, default: '' },
  unidadeContratada: { type: String, default: '' },
  observacoesContratuais: { type: String, default: '' },
  regrasCredito: {
    permiteRolagem: { type: Boolean, default: false },
    diasRetencaoFalta: { type: Number, default: 0 },
    deducaoFaltaAtraso: { type: Number, default: 1 }
  }
}, { _id: false });

const BloqueioCadastralSchema = new Schema({
  bloqueado: { type: Boolean, default: false },
  motivo: { type: String, default: '' },
  dadosInformadosPeloCliente: { type: Boolean, default: false },
  origemCadastro: { 
    type: String, 
    enum: ['publico_onboarding', 'link_venda', 'admin_painel', 'importacao'],
    default: 'admin_painel'
  },
  historicoDesbloqueios: [{
    dataHora: { type: Date, default: Date.now },
    operadorNome: { type: String, required: true },
    operadorEmail: { type: String, default: '' },
    justificativa: { type: String, required: true },
    camposAlterados: [{ type: String }],
    ip: { type: String, default: '' }
  }]
}, { _id: false });

const ClientSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  codigo: { type: String },
  cadastroConcluido: { type: Boolean, default: false },
  termoAceito: { type: Boolean, default: false },
  dataAceiteTermo: { type: Date },
  dadosPessoais: { type: DadosPessoaisSchema, required: true },
  dadosClinicos: { type: DadosClinicosSchema, default: () => ({}) },
  dadosComerciais: { type: DadosComerciaisSchema, default: () => ({}) },
  bloqueioCadastral: { type: BloqueioCadastralSchema, default: () => ({}) },
  profissionalId: { type: Schema.Types.ObjectId, ref: 'Professional', default: null }
}, { timestamps: true });

export default models.Client || model('Client', ClientSchema);


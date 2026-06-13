import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import fs from 'fs';
import path from 'path';
import Plan from '@/models/Plan';
import Professional from '@/models/Professional';
import Client from '@/models/Client';
import Appointment from '@/models/Appointment';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import PhysioReport from '@/models/PhysioReport';
import Medication from '@/models/Medication';
import Financial from '@/models/Financial';
import Notification from '@/models/Notification';
import ClientWorkout from '@/models/ClientWorkout';
import FixedSchedule from '@/models/FixedSchedule';
import Prontuario from '@/models/Prontuario';
import StrengthTest from '@/models/StrengthTest';
import Exercise from '@/models/Exercise';

// Static ObjectIDs for stable references
const ids = {
  plans: {
    plan_1: '6668ab010101010101010101',
    plan_2: '6668ab010101010101010102',
    plan_3: '6668ab010101010101010103',
    plan_emergencial: '6668ab010101010101010104',
    plan_emergencial_2: '6668ab010101010101010105',
    plan_agudo: '6668ab010101010101010106',
    plan_cronico_1: '6668ab010101010101010107',
    plan_cronico_2: '6668ab010101010101010108',
    plan_academia: '6668ab010101010101010109'
  },
  users: {
    admin: '6668ab020202020202020201',
    fisio: '6668ab020202020202020202',
    prof: '6668ab020202020202020203',
    aluno1: '6668ab020202020202020204',
    aluno2: '6668ab020202020202020205',
    aluno3: '6668ab020202020202020206',
    aluno4: '6668ab020202020202020207'
  },
  professionals: {
    prof_1: '6668ab030303030303030301', // Dr. Andre
    prof_2: '6668ab030303030303030302'  // Prof Camila
  },
  clients: {
    cli_1: '6668ab040404040404040401',
    cli_2: '6668ab040404040404040402',
    cli_3: '6668ab040404040404040403',
    cli_4: '6668ab040404040404040404'
  }
};

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Ação não permitida em ambiente de produção.' }, { status: 403 });
  }
  try {
    await dbConnect();

    // ─────────────────────────────────────────────────────────────────────────
    // SAFETY: only delete TEST data — never touch real user records.
    // Test users are identified by the static ObjectIDs defined in `ids.users`
    // and by the @clube.com e-mail domain.
    // ─────────────────────────────────────────────────────────────────────────
    const testUserIds = Object.values(ids.users);
    const testProfIds = Object.values(ids.professionals);
    const testClientIds = Object.values(ids.clients);

    // Remove test users (by static ID or @clube.com email as a safety net)
    await User.deleteMany({ $or: [{ _id: { $in: testUserIds } }, { email: /@clube\.com$/i }] });
    // Remove test professionals, clients and all their linked clinical data
    await Professional.deleteMany({ _id: { $in: testProfIds } });
    await Client.deleteMany({ _id: { $in: testClientIds } });

    // Plans, medications, financial and exercises are shared/global test data
    await Plan.deleteMany({});
    await Medication.deleteMany({});
    await Financial.deleteMany({});
    await Exercise.deleteMany({});

    // Clinical/scheduling data linked to test clients
    await Appointment.deleteMany({ $or: [{ profissionalId: { $in: testProfIds } }, { clienteId: { $in: testClientIds } }] });
    await PhysicalAssessment.deleteMany({ clienteId: { $in: testClientIds } });
    await PhysioReport.deleteMany({ clienteId: { $in: testClientIds } });
    await Notification.deleteMany({ clienteId: { $in: testClientIds } });
    await ClientWorkout.deleteMany({ clienteId: { $in: testClientIds } });
    await FixedSchedule.deleteMany({ $or: [{ profissionalId: { $in: testProfIds } }, { clienteId: { $in: testClientIds } }] });
    await Prontuario.deleteMany({ clienteId: { $in: testClientIds } });
    await StrengthTest.deleteMany({ clienteId: { $in: testClientIds } });

    // 2. Insert Plans
    const plansData = [
      { _id: ids.plans.plan_1, nome: 'Academia VIP', validadeDias: 30, limiteSessoesAcademia: 20, limiteSessoesConsultorio: 0, preco: 150.00, creditosTotal: 20, servicosPermitidos: ['Treino Monitorado', 'Treino Livre', 'Recovery', 'Avaliação Física', 'Teste de Força', 'Massagem'] },
      { _id: ids.plans.plan_2, nome: 'Fisioterapia Individual', validadeDias: 30, limiteSessoesAcademia: 0, limiteSessoesConsultorio: 8, preco: 450.00, creditosTotal: 8, servicosPermitidos: ['Avaliação Fisioterápica', 'Emergência', 'Massagem'] },
      { _id: ids.plans.plan_3, nome: 'Clube Completo (Fisio + Academia)', validadeDias: 30, limiteSessoesAcademia: 12, limiteSessoesConsultorio: 4, preco: 490.00, creditosTotal: 16, servicosPermitidos: ['Treino Monitorado', 'Treino Livre', 'Recovery', 'Avaliação Física', 'Teste de Força', 'Avaliação Fisioterápica', 'Emergência', 'Massagem'] },
      { _id: ids.plans.plan_emergencial, nome: 'Plano Emergencial', validadeDias: 14, limiteSessoesAcademia: 0, limiteSessoesConsultorio: 14, preco: 1500.00, creditosTotal: 14, servicosPermitidos: ['Avaliação Fisioterápica', 'Emergência', 'Massagem'] },
      { _id: ids.plans.plan_emergencial_2, nome: 'Plano Emergencial 2', validadeDias: 28, limiteSessoesAcademia: 0, limiteSessoesConsultorio: 28, preco: 2000.00, creditosTotal: 28, servicosPermitidos: ['Avaliação Fisioterápica', 'Emergência', 'Massagem'] },
      { _id: ids.plans.plan_agudo, nome: 'Agudo', validadeDias: 30, limiteSessoesAcademia: 30, limiteSessoesConsultorio: 8, preco: 2500.00, creditosTotal: 38, servicosPermitidos: ['Treino Monitorado', 'Treino Livre', 'Recovery', 'Avaliação Física', 'Teste de Força', 'Avaliação Fisioterápica', 'Emergência', 'Massagem'] },
      { _id: ids.plans.plan_cronico_1, nome: 'Crônico 1', validadeDias: 30, limiteSessoesAcademia: 30, limiteSessoesConsultorio: 12, preco: 4000.00, creditosTotal: 42, servicosPermitidos: ['Treino Monitorado', 'Treino Livre', 'Recovery', 'Avaliação Física', 'Teste de Força', 'Avaliação Fisioterápica', 'Emergência', 'Massagem'] },
      { _id: ids.plans.plan_cronico_2, nome: 'Crônico 2', validadeDias: 365, limiteSessoesAcademia: 365, limiteSessoesConsultorio: 52, preco: 1200.00, creditosTotal: 417, servicosPermitidos: ['Treino Monitorado', 'Treino Livre', 'Recovery', 'Avaliação Física', 'Teste de Força', 'Avaliação Fisioterápica', 'Emergência', 'Massagem'] },
      { _id: ids.plans.plan_academia, nome: 'Academia', validadeDias: 30, limiteSessoesAcademia: 9, limiteSessoesConsultorio: 0, preco: 2500.00, creditosTotal: 9, servicosPermitidos: ['Treino Monitorado', 'Treino Livre', 'Recovery', 'Avaliação Física', 'Teste de Força', 'Avaliação Fisioterápica', 'Emergência', 'Massagem'] }
    ];
    await Plan.insertMany(plansData);

    // 3. Insert Users
    const usersData = [
      { _id: ids.users.admin, nome: 'Admin Geral', email: 'admin@clube.com', tipo: 'admin', cargo: 'Administrador Geral' },
      { _id: ids.users.fisio, nome: 'Dr. André Costa', email: 'fisio@clube.com', tipo: 'professional', cargo: 'Fisio' },
      { _id: ids.users.prof, nome: 'Profª. Camila Lima', email: 'prof@clube.com', tipo: 'professional', cargo: 'Treino' },
      { _id: ids.users.aluno1, nome: 'Sávio Silva', email: 'aluno1@clube.com', tipo: 'client', cargo: 'Aluno VIP' },
      { _id: ids.users.aluno2, nome: 'Maria Santos', email: 'aluno2@clube.com', tipo: 'client', cargo: 'Aluno' },
      { _id: ids.users.aluno3, nome: 'João Oliveira', email: 'aluno3@clube.com', tipo: 'client', cargo: 'Aluno' },
      { _id: ids.users.aluno4, nome: 'Cliente Fictício', email: 'ficticio@clube.com', tipo: 'client', cargo: 'Aluno' }
    ];
    await User.insertMany(usersData);

    // 4. Insert Professionals
    const professionalsData = [
      { _id: ids.professionals.prof_1, userId: ids.users.fisio, nome: 'Dr. André Costa', especialidade: 'Fisioterapia e Quiropraxia', registro: 'CREFITO 12345-F' },
      { _id: ids.professionals.prof_2, userId: ids.users.prof, nome: 'Profª. Camila Lima', especialidade: 'Avaliação Física e Treinamento', registro: 'CREF 54321-G' }
    ];
    await Professional.insertMany(professionalsData);

    // 5. Insert Clients
    const clientsData = [
      {
        _id: ids.clients.cli_1,
        userId: ids.users.aluno1,
        dadosPessoais: {
          nome: 'Sávio Silva',
          cpf: '123.456.789-00',
          dataNascimento: '1995-05-15',
          sexo: 'M',
          telefone: '(11) 98765-4321',
          email: 'aluno1@clube.com',
          endereco: 'Rua das Flores, 123 - São Paulo/SP'
        },
        dadosClinicos: {
          lesoes: 'Hérnia de disco L4-L5',
          restricoes: 'Evitar sobrecarga axial na coluna e flexão lombar excessiva',
          medicamentos: 'Nenhum de uso contínuo',
          historicoClinico: 'Cirurgia no joelho esquerdo em 2021 (menisco). Dor lombar crônica leve.',
          observacoes: 'Paciente focado em fortalecimento de core e estabilização de coluna.'
        },
        dadosComerciais: {
          planoId: ids.plans.plan_3,
          vencimento: '2026-06-15',
          frequencia: 3,
          parcelas: 1,
          status: 'ativo',
          contrato: 'Assinado em 15/05/2026',
          creditosTotal: 12,
          creditosUsados: 3,
          creditosReservados: 1,
          creditosMassagemTotal: 1,
          creditosMassagemUsados: 0,
          creditosMassagemReservados: 0,
          descontoValor: 0,
          descontoTipo: 'percentual',
          duracao: 'mensal',
          formaPagamento: 'pix',
          creditosUltimoReset: '2026-06'
        }
      },
      {
        _id: ids.clients.cli_2,
        userId: ids.users.aluno2,
        dadosPessoais: {
          nome: 'Maria Santos',
          cpf: '987.654.321-11',
          dataNascimento: '1988-10-22',
          sexo: 'F',
          telefone: '(11) 97777-6666',
          email: 'aluno2@clube.com',
          endereco: 'Av. Paulista, 1500 - São Paulo/SP'
        },
        dadosClinicos: {
          lesoes: 'Tendinite patelar direita',
          restricoes: 'Evitar saltos e agachamentos profundos com carga alta',
          medicamentos: 'Anti-inflamatório ocasional',
          historicoClinico: 'Paciente sedentária iniciando atividades físicas para reabilitação do joelho.',
          observacoes: 'Encaminhada pela ortopedia para fortalecimento de quadríceps.'
        },
        dadosComerciais: {
          planoId: ids.plans.plan_2,
          vencimento: '2026-06-01',
          frequencia: 2,
          parcelas: 1,
          status: 'ativo',
          contrato: 'Assinado em 01/05/2026',
          creditosTotal: 8,
          creditosUsados: 2,
          creditosReservados: 0,
          creditosMassagemTotal: 1,
          creditosMassagemUsados: 0,
          creditosMassagemReservados: 0,
          descontoValor: 0,
          descontoTipo: 'percentual',
          duracao: 'mensal',
          formaPagamento: 'pix',
          creditosUltimoReset: '2026-06'
        }
      },
      {
        _id: ids.clients.cli_3,
        userId: ids.users.aluno3,
        dadosPessoais: {
          nome: 'João Oliveira',
          cpf: '456.789.123-22',
          dataNascimento: '2000-01-30',
          sexo: 'M',
          telefone: '(11) 96666-5555',
          email: 'aluno3@clube.com',
          endereco: 'Rua Augusta, 450 - São Paulo/SP'
        },
        dadosClinicos: {
          lesoes: 'Entorse de tornozelo recente (grau 1)',
          restricoes: 'Movimentos de impacto lateral',
          medicamentos: 'Nenhum',
          historicoClinico: 'Praticante de futebol de final de semana, machucou há 10 dias.',
          observacoes: 'Foco inicial em propriocepção e fortalecimento do tornozelo.'
        },
        dadosComerciais: {
          planoId: ids.plans.plan_1,
          vencimento: '2026-05-18',
          frequencia: 5,
          parcelas: 1,
          status: 'vencido',
          contrato: 'Assinado em 18/04/2026',
          creditosTotal: 20,
          creditosUsados: 0,
          creditosReservados: 0,
          creditosMassagemTotal: 1,
          creditosMassagemUsados: 0,
          creditosMassagemReservados: 0,
          descontoValor: 0,
          descontoTipo: 'percentual',
          duracao: 'mensal',
          formaPagamento: 'pix',
          creditosUltimoReset: '2026-05'
        }
      },
      {
        _id: ids.clients.cli_4,
        userId: ids.users.aluno4,
        dadosPessoais: {
          nome: 'Cliente Fictício',
          cpf: '444.444.444-44',
          dataNascimento: '1990-01-01',
          sexo: 'M',
          telefone: '(11) 99999-9994',
          email: 'ficticio@clube.com',
          endereco: 'Rua Fictícia, 123'
        },
        dadosClinicos: {
          lesoes: '',
          restricoes: '',
          medicamentos: '',
          historicoClinico: '',
          observacoes: ''
        },
        dadosComerciais: {
          planoId: ids.plans.plan_1,
          vencimento: '2026-06-10',
          frequencia: 5,
          parcelas: 1,
          status: 'ativo',
          creditosTotal: 20,
          creditosUsados: 0
        }
      }
    ];
    await Client.insertMany(clientsData);

    // 6. Insert Appointments
    const appointmentsData = [
      { data: '2026-05-20', horario: '08:00', tipo: 'consultorio', servico: 'Avaliação Fisioterápica', consumeCredito: false, profissionalId: ids.professionals.prof_1, clienteId: ids.clients.cli_1, status: 'presenca' },
      { data: '2026-05-20', horario: '09:00', tipo: 'consultorio', servico: 'Avaliação Fisioterápica', consumeCredito: false, profissionalId: ids.professionals.prof_1, clienteId: ids.clients.cli_2, status: 'agendado' },
      { data: '2026-05-20', horario: '08:00', tipo: 'academia', servico: 'Treino Monitorado', consumeCredito: true, profissionalId: ids.professionals.prof_2, clienteId: ids.clients.cli_1, status: 'presenca' },
      { data: '2026-05-20', horario: '08:00', tipo: 'academia', servico: 'Treino Monitorado', consumeCredito: true, profissionalId: ids.professionals.prof_2, clienteId: ids.clients.cli_2, status: 'presenca' },
      { data: '2026-05-20', horario: '08:00', tipo: 'academia', servico: 'Treino Livre', consumeCredito: false, profissionalId: ids.professionals.prof_2, clienteId: ids.clients.cli_3, status: 'presenca' },
      { data: '2026-05-30', horario: '10:00', tipo: 'consultorio', servico: 'Avaliação Fisioterápica', consumeCredito: false, profissionalId: ids.professionals.prof_1, clienteId: ids.clients.cli_1, status: 'agendado' },
      { data: '2026-05-30', horario: '14:00', tipo: 'academia', servico: 'Treino Monitorado', consumeCredito: true, profissionalId: ids.professionals.prof_2, clienteId: ids.clients.cli_2, status: 'agendado' }
    ];
    await Appointment.insertMany(appointmentsData);

    // 7. Insert Physical Assessments
    const physicalAssessmentsData = [
      {
        clienteId: ids.clients.cli_1,
        avaliadorId: ids.professionals.prof_2,
        data: '2026-02-15',
        dadosMedidos: {
          idade: 32, peso: 85.2, altura: 1.825, sexo: 'M',
          objetivoPrincipal: 'Perda de gordura e ganho de massa magra',
          saudeGeral: { pressaoArterial: '125/85 mmHg', sono: '6-7 h por noite', nutricao: 'Regular', atividadeFisica: '3x por semana', medicamentos: 'Nenhum', cirurgias: 'Nenhuma', queixas: 'Dor lombar ocasional' },
          circunferencias: { ombros: 114, torax: 106, cintura: 88, abdomen: 96, quadril: 102, braçoD: 33.5, braçoE: 33, antebraçoD: 27.5, antebraçoE: 27, coxaD: 56, coxaE: 55.5, panturrilhaD: 37.5, panturrilhaE: 37 },
          dobras: { peitoral: 15, triceps: 16, subescapular: 18, subaxilar: 18, suprailiaca: 20, abdomen: 24, coxa: 20, panturrilha: 14 },
          somaDobras: 145, percentil: 40,
          goniometria: { quadrilFlexao1D: 75, quadrilFlexao1E: 75, quadrilFlexao2D: 100, quadrilFlexao2E: 102, quadrilRotIntD: 35, quadrilRotIntE: 36, quadrilRotExtD: 40, quadrilRotExtE: 40, joelhoFlexaoD: 135, joelhoFlexaoE: 135, joelhoPopliteoD: 148, joelhoPopliteoE: 148, tornozeloDorsi1D: 35, tornozeloDorsi1E: 35, tornozeloDorsi2D: 28, tornozeloDorsi2E: 28, tornozeloFlexaoPlantarD: 40, tornozeloFlexaoPlantarE: 40, ombroRotIntD: 80, ombroRotIntE: 80, ombroRotExtD: 85, ombroRotExtE: 85, ombroAbducaoD: 170, ombroAbducaoE: 170 },
          testesEspeciais: { oberD: 'Negativo', oberE: 'Negativo', thomasD: 'Negativo', thomasE: 'Negativo' },
          flexibilidade: 'Regular (28cm no banco de Wells)', postura: 'Ligeira hiperlordose lombar e protusão de ombros'
        },
        resultadosCalculados: { imc: 25.6, imcClassificacao: 'Sobrepeso', rcq: 0.91, rcqClassificacao: 'Risco Moderado', percentualGordura: 24.8, massaMagra: 62.8, massaGorda: 22.4 },
        metas: { metaGorduraValor: 0, metaGorduraAlvo: 10, metaMassaValor: 0, metaMassaAlvo: 5, metaCondicionamentoProgresso: 30, metaFlexibilidadeProgresso: 30 },
        observacoes: 'Paciente iniciou o plano visando condicionamento geral e reabilitação lombar.',
        pdfName: 'Avaliacao_Savio_Silva_15_02_2026.pdf'
      },
      {
        clienteId: ids.clients.cli_1,
        avaliadorId: ids.professionals.prof_2,
        data: '2026-05-15',
        dadosMedidos: {
          idade: 32, peso: 82.4, altura: 1.825, sexo: 'M',
          objetivoPrincipal: 'Perda de gordura e ganho de massa magra',
          saudeGeral: { pressaoArterial: '120/80 mmHg', sono: '7-8 h por noite', nutricao: 'Adequada', atividadeFisica: '4-5x por semana', medicamentos: 'Nenhum', cirurgias: 'Nenhuma', queixas: 'Nenhuma' },
          circunferencias: { ombros: 112, torax: 104, cintura: 84, abdomen: 92, quadril: 98, braçoD: 34, braçoE: 33.5, antebraçoD: 28, antebraçoE: 27.5, coxaD: 58, coxaE: 57, panturrilhaD: 38, panturrilhaE: 37.5 },
          dobras: { peitoral: 12, triceps: 14, subescapular: 16, subaxilar: 15, suprailiaca: 17, abdomen: 20, coxa: 18, panturrilha: 12 },
          somaDobras: 124, percentil: 60,
          goniometria: { quadrilFlexao1D: 80, quadrilFlexao1E: 80, quadrilFlexao2D: 110, quadrilFlexao2E: 112, quadrilRotIntD: 40, quadrilRotIntE: 42, quadrilRotExtD: 45, quadrilRotExtE: 46, joelhoFlexaoD: 142, joelhoFlexaoE: 140, joelhoPopliteoD: 155, joelhoPopliteoE: 156, tornozeloDorsi1D: 40, tornozeloDorsi1E: 40, tornozeloDorsi2D: 32, tornozeloDorsi2E: 34, tornozeloFlexaoPlantarD: 45, tornozeloFlexaoPlantarE: 46, ombroRotIntD: 85, ombroRotIntE: 86, ombroRotExtD: 90, ombroRotExtE: 92, ombroAbducaoD: 180, ombroAbducaoE: 180 },
          testesEspeciais: { oberD: 'Negativo', oberE: 'Negativo', thomasD: 'Negativo', thomasE: 'Negativo' },
          flexibilidade: 'Excelente (35cm no banco de Wells)', postura: 'Melhora postural e ombros alinhados'
        },
        resultadosCalculados: { imc: 24.75, imcClassificacao: 'Normal', rcq: 0.89, rcqClassificacao: 'Risco Moderado', percentualGordura: 21.3, massaMagra: 64.9, massaGorda: 17.5 },
        metas: { metaGorduraValor: 3.5, metaGorduraAlvo: 10, metaMassaValor: 2.1, metaMassaAlvo: 5, metaCondicionamentoProgresso: 60, metaFlexibilidadeProgresso: 50 },
        observacoes: 'Excelente evolução na redução do percentual de gordura e aumento da massa magra.',
        pdfName: 'Avaliacao_Savio_Silva_15_05_2026.pdf'
      }
    ];
    await PhysicalAssessment.insertMany(physicalAssessmentsData);

    // 8. Insert Physio Reports
    const physioReportsData = [
      {
        clienteId: ids.clients.cli_1,
        profissionalId: ids.professionals.prof_1,
        data: '2026-05-12',
        conteudo: {
          queixaPrincipal: 'Dor na região lombar baixa ao permanecer em pé por mais de 30 minutos.',
          avaliacaoPostural: 'Hiperlordose lombar compensatória, báscula de pelve anteriorizada.',
          adm: 'Flexão de tronco limitada a 70 graus por dor lombar. Extensão preservada.',
          dorEscala: 6,
          testes: 'Lasegue negativo bilateralmente. Ely teste positivo para encurtamento de reto femoral.',
          evolucao: 'Primeira consulta de avaliação. Sem irradiação para membros inferiores.',
          conduta: 'Exercícios de mobilidade de quadril, fortalecimento de transverso do abdômen e glúteos. Terapia manual.',
          exercicios: 'Alongamento de flexores de quadril, ponte pélvica unilateral, prancha isométrica.'
        },
        pdfName: 'Relatorio_Fisioterapia_Savio_12_05_2026.pdf'
      }
    ];
    await PhysioReport.insertMany(physioReportsData);

    // 9. Insert Medications
    const medicationsData = [
      { nome: 'Dipirona Sódica 500mg', categoria: 'Analgésico', quantidade: 150, unidade: 'Comprimidos', lote: 'L-DP2026', validade: '2026-11-20', fabricante: 'Medley', fornecedor: 'Drogasil Distribuidora', data_compra: '2026-04-15', valor_compra: 45.00, observacoes: 'Para uso emergencial.' },
      { nome: 'Ibuprofeno 600mg', categoria: 'Anti-inflamatório', quantidade: 5, unidade: 'Frascos', lote: 'L-IB55', validade: '2026-05-25', fabricante: 'Aché', fornecedor: 'Distribuidora FarmaSul', data_compra: '2026-05-02', valor_compra: 75.00, observacoes: 'Vencimento próximo.' },
      { nome: 'Álcool em Gel 70%', categoria: 'Higiene', quantidade: 2, unidade: 'Frascos', lote: 'L-AL02', validade: '2026-05-10', fabricante: 'Coperalcool', fornecedor: 'Macro Atacado', data_compra: '2026-03-01', valor_compra: 30.00, observacoes: 'VENCIDO.' }
    ];
    await Medication.insertMany(medicationsData);

    // 10. Insert Financial Records
    const financialData = [
      { descricao: 'Aluguel do Imóvel', categoria: 'Aluguel', valor: 3500.00, vencimento: '2026-06-05', status: 'Pendente', forma_pagamento: 'Boleto', observacoes: 'Sede do clube.' },
      { descricao: 'Energia Elétrica Enel', categoria: 'Energia', valor: 680.50, vencimento: '2026-05-20', status: 'Atrasado', forma_pagamento: 'Pix' },
      { descricao: 'Internet Fibra Link', categoria: 'Internet', valor: 250.00, vencimento: '2026-05-22', status: 'Pendente', forma_pagamento: 'Boleto' }
    ];
    await Financial.insertMany(financialData);

    // 11. Insert Notifications
    const notificationsData = [
      { clienteId: ids.clients.cli_3, tipo: 'vencimento', mensagem: 'Seu plano expira em breve (vencido em 18/05/2026).', dataCriacao: '2026-05-15', lida: false },
      { clienteId: ids.clients.cli_1, tipo: 'aniversario', mensagem: 'Feliz aniversário! Desejamos muita saúde!', dataCriacao: '2026-05-15', lida: true }
    ];
    await Notification.insertMany(notificationsData);

    // 12. Seeding global exercises (1647 exercises from original JSON)
    const exercisesFilePath = path.join(process.cwd(), 'src', 'data', 'exercises.json');
    let exercisesData = [];
    if (fs.existsSync(exercisesFilePath)) {
      const rawData = JSON.parse(fs.readFileSync(exercisesFilePath, 'utf8'));
      exercisesData = rawData.map((ex: any) => ({
        nome: ex.nome || '',
        grupo: ex.grupo || '',
        equipamento: ex.equipamento || '',
        instrucoes: ex.instrucoes || '',
        gifUrl: ex.gifUrl || ''
      }));
    } else {
      console.warn('exercises.json not found at ' + exercisesFilePath);
    }
    await Exercise.insertMany(exercisesData);

    // 13. Seeding Client Workouts (Workout sheets)
    const clientWorkoutData = [
      {
        clienteId: ids.clients.cli_1,
        fichasMonitorado: [
          {
            id: 'A',
            nome: 'Hipertrofia A - Membros Superiores',
            ultimaAtualizacao: '2026-05-15',
            observacoesGerais: 'Cuidado extra com a lombar devido à hérnia de disco. Foco em controle de movimento.',
            exercicios: [
              { exercicioId: 'SUPINO RETO', series: 4, repeticoes: '10', carga: '20kg', descanso: '60s', observacao: 'Manter cotovelos em 45 graus.' },
              { exercicioId: 'PUXADA FRENTE', series: 4, repeticoes: '12', carga: '25kg', descanso: '60s', observacao: 'Contrair bem as costas.' },
              { exercicioId: 'ROSCA DIRETA', series: 3, repeticoes: '10', carga: '10kg', descanso: '45s', observacao: 'Sem roubar com a lombar.' }
            ]
          },
          { id: 'B', nome: 'Ficha B', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] },
          { id: 'C', nome: 'Ficha C', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] }
        ],
        fichasLivre: [
          {
            id: 'A',
            nome: 'Cardio & Mobilidade',
            ultimaAtualizacao: '2026-05-15',
            observacoesGerais: 'Fazer alongamento estático e dinâmico antes e depois.',
            exercicios: [
              { exercicioId: 'PRANCHA FRONTAL ISOMÉTRICA', series: 3, repeticoes: '45s', carga: '0', descanso: '30s', observacao: 'Foco no core.' }
            ]
          },
          { id: 'B', nome: 'Ficha B', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] },
          { id: 'C', nome: 'Ficha C', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] }
        ]
      }
    ];
    await ClientWorkout.insertMany(clientWorkoutData);

    // 14. Seeding Fixed Schedules
    const fixedSchedulesData = [
      { clienteId: ids.clients.cli_1, profissionalId: ids.professionals.prof_2, diaSemana: 1, horario: '08:00', servico: 'Treino Monitorado', dataInicio: '2026-05-15' },
      { clienteId: ids.clients.cli_1, profissionalId: ids.professionals.prof_2, diaSemana: 3, horario: '08:00', servico: 'Treino Monitorado', dataInicio: '2026-05-15' },
      { clienteId: ids.clients.cli_2, profissionalId: ids.professionals.prof_1, diaSemana: 2, horario: '09:00', servico: 'Avaliação Fisioterápica', dataInicio: '2026-05-15' }
    ];
    await FixedSchedule.insertMany(fixedSchedulesData);

    // 15. Seeding Prontuarios
    const prontuariosData = [
      { clienteId: ids.clients.cli_1, profissionalId: ids.professionals.prof_1, data: '2026-05-12', conteudo: 'Paciente com redução de dor na região lombar após os exercícios de fortalecimento de core.' },
      { clienteId: ids.clients.cli_2, profissionalId: ids.professionals.prof_1, data: '2026-05-20', conteudo: 'Tendinite patelar controlada. Iniciado fortalecimento de quadríceps de cadeia cinética fechada.' }
    ];
    await Prontuario.insertMany(prontuariosData);

    // 16. Seeding Strength Tests
    const strengthTestsData = [
      {
        clienteId: ids.clients.cli_1,
        profissionalId: ids.professionals.prof_2,
        data: '2026-05-15',
        exercicios: [
          { nome: 'Supino Reto', carga: 80, reps: 1 },
          { nome: 'Remada Curvada / Máquina', carga: 70, reps: 1 },
          { nome: 'Desenvolvimento de Ombros', carga: 40, reps: 1 },
          { nome: 'Puxada Alta / Lat Pulldown', carga: 70, reps: 1 },
          { nome: 'Rotação Externa de Ombro', carga: 14, reps: 1 },
          { nome: 'Rotação Interna de Ombro', carga: 20, reps: 1 },
          { nome: 'Abdução de Ombro', carga: 22, reps: 1 }
        ],
        analise: {
          riscoOmbro: false,
          ratios: {
            'rotExternaRotInterna': 0.70, // 14 / 20 = 0.70 (Normal/Safe: 0.66 - 0.75)
            'abducaoRotInterna': 1.10   // 22 / 20 = 1.10
          }
        },
        observacoes: 'Excelente equilíbrio muscular nos rotadores do ombro. Sem sinais de desalinhamento ou fraqueza patológica.'
      }
    ];
    await StrengthTest.insertMany(strengthTestsData);

    return NextResponse.json({ success: true, message: 'Dados de teste resetados e repopulados com sucesso!' });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

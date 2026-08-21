import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';
import Contract from '@/models/Contract';
import Proposal from '@/models/Proposal';
import { checkSessionPermission } from '@/utils/authHelper';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function isFictitiousCpf(cpf: string | undefined): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (!clean || clean.length !== 11) return true;
  if (/^(\d)\1{10}$/.test(clean)) return true;
  return false;
}

function isFictitiousPhone(phone: string | undefined): boolean {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, '');
  if (!clean || clean.length < 10) return true;
  if (/^(\d)\1+$/.test(clean)) return true;
  return false;
}

function isFictitiousAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  const lower = addr.trim().toLowerCase();
  if (lower.includes('teste') || lower.includes('ficticio') || lower.includes('fictício') || lower.includes('exemplo')) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { user } = await checkSessionPermission(['admin']);

    const allClients = await Client.find({}).populate('userId');

    let removedMockCount = 0;
    let sanitizedRealCount = 0;
    let shieldedCount = 0;
    const details: any[] = [];

    for (const client of allClients) {
      const pes = client.dadosPessoais || {};
      const userDoc = client.userId as any;
      const clientEmail = (pes.email || userDoc?.email || '').trim().toLowerCase();

      // Regra 1: Todo e-mail no formato *@clube.com pertencente a aluno é fictício/mock
      const isClubeMock = clientEmail.endsWith('@clube.com') && 
        (clientEmail.startsWith('aluno') || clientEmail.startsWith('ficticio') || clientEmail.startsWith('teste') || userDoc?.isTest);

      if (isClubeMock) {
        await Contract.deleteMany({ clientId: client._id });
        await Proposal.deleteMany({ clientId: client._id });
        await Client.findByIdAndDelete(client._id);
        if (userDoc?._id && (userDoc.tipo === 'client' || userDoc.roles?.includes('client'))) {
          await User.findByIdAndDelete(userDoc._id);
        }
        removedMockCount++;
        details.push({
          action: 'removed_mock',
          nome: pes.nome || 'Mock Aluno',
          email: clientEmail
        });
        continue;
      }

      // Regra 2: Alunos Reais -> Limpar dados fictícios / placeholders provisórios
      let modified = false;

      // Limpar CPF fictício
      if (pes.cpf && isFictitiousCpf(pes.cpf)) {
        pes.cpf = '';
        modified = true;
      }

      // Limpar Telefone fictício
      if (pes.telefone && isFictitiousPhone(pes.telefone)) {
        pes.telefone = '';
        modified = true;
      }

      // Limpar Endereço fictício
      if (pes.endereco && isFictitiousAddress(pes.endereco)) {
        pes.endereco = '';
        pes.numero = '';
        pes.complemento = '';
        pes.bairro = '';
        pes.cidade = '';
        pes.estado = '';
        pes.cep = '';
        modified = true;
      }

      // Regra 3: Trancamento / Blindagem Universal
      const currentBloqueio = client.bloqueioCadastral || {};
      if (currentBloqueio.bloqueado !== false) {
        client.bloqueioCadastral = {
          bloqueado: true,
          motivo: pes.cpf ? 'Informação fornecida pelo contratante' : 'Dado consolidado no cadastro',
          dadosInformadosPeloCliente: true,
          origemCadastro: currentBloqueio.origemCadastro || 'admin_painel',
          historicoDesbloqueios: currentBloqueio.historicoDesbloqueios || []
        };
        shieldedCount++;
        modified = true;
      }

      if (modified) {
        client.dadosPessoais = pes;
        client.markModified('dadosPessoais');
        client.markModified('bloqueioCadastral');
        await client.save();
        sanitizedRealCount++;
      }

      details.push({
        action: 'sanitized_and_shielded',
        nome: pes.nome,
        email: clientEmail,
        cpf: pes.cpf ? 'OK' : 'FALTANTE',
        endereco: pes.endereco ? 'OK' : 'FALTANTE',
        telefone: pes.telefone ? 'OK' : 'FALTANTE'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Varredura e Blindagem Geral concluída com sucesso!',
      stats: {
        removedMockCount,
        sanitizedRealCount,
        shieldedCount,
        totalRemainingClients: allClients.length - removedMockCount
      },
      details
    });
  } catch (error: any) {
    console.error('Erro na varredura:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

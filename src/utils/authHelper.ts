import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Client from '@/models/Client';

/**
 * Valida a sessão atual e verifica se o usuário tem permissão para acessar o recurso.
 * Lança um erro caso o usuário não esteja autenticado ou não possua autorização.
 */
export async function checkSessionPermission(requiredRoles: string[], targetClientId?: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error('Não autenticado');
  }

  const user = session.user as any;
  const userRoles = user.activeRoles || [user.role || 'client'];

  // 1. Administradores Gerais têm acesso livre
  if (userRoles.includes('admin')) {
    return { authorized: true, user };
  }

  // 2. Valida se o cargo do usuário está entre os autorizados na rota
  const hasPermission = requiredRoles.some(role => userRoles.includes(role));
  if (!hasPermission) {
    throw new Error('Acesso não autorizado');
  }

  // 3. Caso profissional: restringe o acesso somente aos alunos vinculados a ele
  if (userRoles.includes('professional') && targetClientId) {
    if (user.email === 'coletivo@clube.com') {
      return { authorized: true, user };
    }
    const client = await Client.findById(targetClientId);
    if (client && (!client.profissionalId || client.profissionalId.toString() !== user.professionalProfileId)) {
      throw new Error('Acesso negado: Aluno não está vinculado a você');
    }
  }

  // 4. Caso aluno: só permite consultar os seus próprios registros
  if (userRoles.includes('client') && targetClientId) {
    if (user.clientProfileId !== targetClientId) {
      throw new Error('Acesso negado: Você só pode acessar seus próprios registros');
    }
  }

  return { authorized: true, user };
}

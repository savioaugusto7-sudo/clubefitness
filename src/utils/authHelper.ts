import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Client from '@/models/Client';

/**
 * Valida a sessão atual e verifica se o usuário tem permissão para acessar o recurso.
 * Utiliza getServerSession e fallback para getToken (JWT do cookie) para máxima resiliência na Vercel.
 */
export async function checkSessionPermission(requiredRoles: string[], targetClientId?: string, req?: Request | any) {
  let user: any = null;

  // 1. Tentar via getServerSession
  try {
    const session = await getServerSession(authOptions);
    if (session && session.user) {
      user = session.user;
    }
  } catch (sessionErr) {
    console.warn('[checkSessionPermission] getServerSession error, tentando getToken fallback:', sessionErr);
  }

  // 2. Fallback: Ler diretamente o JWT do cookie se req estiver disponível
  if (!user && req) {
    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token) {
        user = {
          id: token.id || token.sub,
          email: token.email,
          role: token.role,
          cargo: token.cargo,
          activeRoles: token.activeRoles || [token.role || 'client'],
          clientProfileId: token.clientProfileId || '',
          professionalProfileId: token.professionalProfileId || '',
          profileId: token.profileId || '',
        };
      }
    } catch (tokenErr) {
      console.warn('[checkSessionPermission] getToken error:', tokenErr);
    }
  }

  if (!user) {
    throw new Error('Não autenticado');
  }

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

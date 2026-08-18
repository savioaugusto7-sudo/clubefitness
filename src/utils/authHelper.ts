import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import Client from '@/models/Client';

/**
 * Validação de sessão e permissão robusta para todas as rotas da aplicação:
 * 1. Utiliza getServerSession(authOptions) como padrão nativo NextAuth.
 * 2. Fallback de decodificação direta de cookie se necessário.
 */
export async function checkSessionPermission(requiredRoles: string[], targetClientId?: string, req?: Request | any) {
  let user: any = null;

  // 1. Método Principal: getServerSession nativo
  try {
    const session = await getServerSession(authOptions);
    if (session && session.user) {
      user = session.user;
    }
  } catch (sessionErr) {
    console.warn('[checkSessionPermission] getServerSession error:', sessionErr);
  }

  // 2. Fallback: Leitura direta do cookie se getServerSession falhar
  if (!user) {
    try {
      const cookieStore = await cookies();
      const tokenCookie = cookieStore.get('next-auth.session-token')?.value || 
                         cookieStore.get('__Secure-next-auth.session-token')?.value ||
                         cookieStore.get('__Secure-next-auth.session-token.0')?.value;

      const secret = process.env.NEXTAUTH_SECRET || 'clubefitness-super-secret-jwt-key-2026';
      if (tokenCookie) {
        const decoded = await decode({ token: tokenCookie, secret });
        if (decoded) {
          user = {
            id: decoded.id || decoded.sub,
            email: decoded.email,
            role: decoded.role,
            cargo: decoded.cargo,
            activeRoles: decoded.activeRoles || [decoded.role || 'client'],
            clientProfileId: decoded.clientProfileId || '',
            professionalProfileId: decoded.professionalProfileId || '',
            profileId: decoded.profileId || '',
          };
        }
      }
    } catch (cookieErr) {
      console.warn('[checkSessionPermission] Cookie decode fallback error:', cookieErr);
    }
  }

  if (!user) {
    throw new Error('Não autenticado');
  }

  const userRoles = user.activeRoles || [user.role || 'client'];
  const isStaff = userRoles.some((r: string) => ['admin', 'professional', 'receptionist'].includes(r)) ||
                  ['admin', 'professional', 'receptionist'].includes(user.role);

  // 1. Membros da equipe e multi-funções têm acesso total
  if (isStaff) {
    return { authorized: true, user };
  }

  // 2. Valida se o cargo do usuário está entre os autorizados na rota
  const hasPermission = requiredRoles.some(role => userRoles.includes(role));
  if (!hasPermission) {
    throw new Error('Acesso não autorizado');
  }

  // 3. Caso aluno puro: só permite consultar os seus próprios registros
  if (userRoles.includes('client') && targetClientId) {
    if (user.clientProfileId && user.clientProfileId !== targetClientId) {
      throw new Error('Acesso negado: Você só pode acessar seus próprios registros');
    }
  }

  return { authorized: true, user };
}

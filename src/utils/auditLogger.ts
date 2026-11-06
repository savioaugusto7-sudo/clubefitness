import dbConnect from '@/utils/dbConnect';
import ClientActivityLog from '@/models/ClientActivityLog';
import User from '@/models/User';

export interface LogClientActivityParams {
  clienteId: string | any;
  usuarioId?: string | any;
  sessionUser?: any;
  executorTipo?: 'aluno' | 'profissional' | 'recepcao' | 'admin' | 'sistema';
  executorNome?: string;
  executorRole?: string;
  executorUserId?: string | any;
  isSelfService?: boolean;
  tipoAcao: 'agendou' | 'cancelou' | 'checkin' | 'login' | 'wellness' | 'trancamento' | 'perfil';
  acao: string;
  detalhes: string;
  metadata?: {
    appointmentId?: string | any;
    dataHorarioOriginal?: string;
    modalidade?: string;
    profissionalNome?: string;
    motivoCancelamento?: string;
    antecedenciaHoras?: number;
    isUltimaHora?: boolean;
    [key: string]: any;
  };
  origem?: 'App Mobile (PWA)' | 'Portal Web' | 'Totem / Autoatendimento' | 'WhatsApp / Link' | 'Painel Administrativo';
  dispositivo?: string;
  ip?: string;
  request?: Request;
}

export function detectDeviceFromUserAgent(ua?: string | null): string {
  if (!ua) return 'Desktop';
  const lower = ua.toLowerCase();
  if (lower.includes('iphone')) return 'iPhone (Mobile)';
  if (lower.includes('ipad')) return 'iPad (Tablet)';
  if (lower.includes('android')) {
    return lower.includes('mobile') ? 'Android (Mobile)' : 'Android (Tablet)';
  }
  if (lower.includes('macintosh') || lower.includes('mac os')) return 'Mac (Desktop)';
  if (lower.includes('windows')) return 'Windows (Desktop)';
  if (lower.includes('linux')) return 'Linux (Desktop)';
  return 'Desktop';
}

export function extractClientIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

/**
 * Registra movimentação do cliente de forma assíncrona e não-bloqueante,
 * com identificação inequívoca de quem executou a ação (Aluno vs Profissional vs Admin).
 */
export async function logClientActivity(params: LogClientActivityParams): Promise<void> {
  try {
    if (!params.clienteId) return;

    await dbConnect();

    let userAgent = '';
    let ip = params.ip || null;
    let dispositivo = params.dispositivo || 'Desktop';
    let origem = params.origem || 'Portal Web';

    if (params.request) {
      userAgent = params.request.headers.get('user-agent') || '';
      if (!ip) {
        ip = extractClientIp(params.request);
      }
      if (!params.dispositivo && userAgent) {
        dispositivo = detectDeviceFromUserAgent(userAgent);
      }
      if (!params.origem) {
        const isMobileHeader = params.request.headers.get('sec-ch-ua-mobile') === '?1';
        if (isMobileHeader || /iphone|android/i.test(userAgent)) {
          origem = 'App Mobile (PWA)';
        }
      }
    }

    // Identificação do Executor
    let executorTipo: 'aluno' | 'profissional' | 'recepcao' | 'admin' | 'sistema' = params.executorTipo || 'aluno';
    let executorNome = params.executorNome || '';
    let executorRole = params.executorRole || '';
    let executorUserId = params.executorUserId || params.usuarioId || null;
    let isSelfService = params.isSelfService !== undefined ? params.isSelfService : false;

    const su = params.sessionUser;
    if (su) {
      executorUserId = su.id || su._id || executorUserId;
      const suRole = String(su.role || su.tipo || '').toLowerCase();
      const suName = su.name || su.nome || '';
      executorRole = suRole;

      const isClientProfile = 
        suRole === 'client' || 
        (su.clientProfileId && String(su.clientProfileId) === String(params.clienteId));

      if (isClientProfile) {
        executorTipo = 'aluno';
        executorNome = 'Próprio Aluno';
        isSelfService = true;
      } else if (suRole === 'admin' || su.cargo === 'Administrador' || su.tipo === 'admin') {
        executorTipo = 'admin';
        executorNome = suName ? `Admin (${suName})` : 'Administrador';
        isSelfService = false;
      } else if (suRole === 'receptionist' || suRole === 'recepcao') {
        executorTipo = 'recepcao';
        executorNome = suName || 'Recepção';
        isSelfService = false;
      } else if (suRole === 'professional' || suRole === 'profissional') {
        executorTipo = 'profissional';
        if (suName.toLowerCase().includes('computador coletivo')) {
          executorNome = 'Computador Coletivo (Recepção/Totem)';
        } else {
          executorNome = suName ? (suName.startsWith('Prof.') ? suName : `Prof. ${suName}`) : 'Profissional';
        }
        isSelfService = false;
      }
    } else if (executorUserId && !executorNome) {
      // Se apenas o usuarioId foi fornecido sem sessionUser
      try {
        const dbUser = await User.findById(executorUserId).select('nome name role tipo cargo').lean();
        if (dbUser) {
          const uRole = String(dbUser.role || dbUser.tipo || '').toLowerCase();
          const uName = (dbUser as any).name || (dbUser as any).nome || '';
          executorRole = uRole;

          if (uRole === 'client') {
            executorTipo = 'aluno';
            executorNome = 'Próprio Aluno';
            isSelfService = true;
          } else if (uRole === 'admin' || (dbUser as any).cargo === 'Administrador') {
            executorTipo = 'admin';
            executorNome = uName ? `Admin (${uName})` : 'Administrador';
            isSelfService = false;
          } else if (uRole === 'receptionist' || uRole === 'recepcao') {
            executorTipo = 'recepcao';
            executorNome = uName || 'Recepção';
            isSelfService = false;
          } else {
            executorTipo = 'profissional';
            if (uName.toLowerCase().includes('computador coletivo')) {
              executorNome = 'Computador Coletivo (Recepção/Totem)';
            } else {
              executorNome = uName ? (uName.startsWith('Prof.') ? uName : `Prof. ${uName}`) : 'Profissional';
            }
            isSelfService = false;
          }
        }
      } catch (err) {
        console.warn('[auditLogger] Erro ao identificar executor por usuarioId:', err);
      }
    }

    if (!executorNome) {
      executorNome = isSelfService ? 'Próprio Aluno' : 'Sistema';
    }

    await ClientActivityLog.create({
      clienteId: params.clienteId,
      usuarioId: executorUserId,
      executorTipo,
      executorNome,
      executorRole,
      executorUserId,
      isSelfService,
      tipoAcao: params.tipoAcao,
      acao: params.acao,
      detalhes: params.detalhes,
      metadata: params.metadata || {},
      origem,
      dispositivo,
      ip
    });
  } catch (error) {
    console.error('[auditLogger] Erro ao registrar log de movimentação do cliente:', error);
  }
}

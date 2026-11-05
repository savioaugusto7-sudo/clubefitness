import dbConnect from '@/utils/dbConnect';
import ClientActivityLog from '@/models/ClientActivityLog';

export interface LogClientActivityParams {
  clienteId: string | any;
  usuarioId?: string | any;
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
 * Registra movimentação do cliente de forma assíncrona e não-bloqueante.
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

    await ClientActivityLog.create({
      clienteId: params.clienteId,
      usuarioId: params.usuarioId || null,
      tipoAcao: params.tipoAcao,
      acao: params.acao,
      detalhes: params.detalhes,
      metadata: params.metadata || {},
      origem,
      dispositivo,
      ip
    });
  } catch (error) {
    // Falha silenciosa para nunca quebrar a requisição do usuário
    console.error('[auditLogger] Erro ao registrar log de movimentação do cliente:', error);
  }
}


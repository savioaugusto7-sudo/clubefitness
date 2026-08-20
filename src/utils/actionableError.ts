/**
 * Utilitário de Diagnóstico Inteligente de Erros (Actionable Error)
 * Traduz erros técnicos para linguagem humana com causa e ação recomendada.
 */

export interface ActionableErrorDetails {
  title: string;
  description: string;
  cause: string;
  solution: string;
  actionText?: string;
  actionType?: 'retry' | 'redirect' | 'focus' | 'draft_restore' | 'contact';
}

export function parseActionableError(rawError: any, context?: string): ActionableErrorDetails {
  const msg = typeof rawError === 'string' ? rawError : (rawError?.message || rawError?.error || 'Erro inesperado.');
  const lower = msg.toLowerCase();

  // 1. Erros de Avaliação Física & Pollock
  if (lower.includes('pollock') || lower.includes('dobras') || lower.includes('soma das dobras')) {
    return {
      title: 'Faltam dobras para o cálculo corporal',
      description: 'Não foi possível calcular o percentual de gordura (Pollock 7 Dobras).',
      cause: 'Uma ou mais dobras cutâneas essenciais estão zeradas ou incompletas.',
      solution: 'Preencha as 7 dobras cutâneas ou selecione o protocolo de 3 dobras / bioimpedância.',
      actionText: 'Revisar Dobras',
      actionType: 'focus'
    };
  }

  // 2. Erros de Geração de Laudo PDF / Anexos
  if (lower.includes('pdf') || lower.includes('anexo') || lower.includes('payload too large') || lower.includes('413')) {
    return {
      title: 'Anexo muito pesado para o Laudo',
      description: 'O relatório não pôde ser gerado devido ao tamanho dos arquivos anexados.',
      cause: 'Fotos ou PDFs anexados ultrapassaram o limite seguro de 5MB.',
      solution: 'Remova ou substitua anexos pesados por imagens comprimidas e tente novamente.',
      actionText: 'Gerar Sem Anexos Pesados',
      actionType: 'retry'
    };
  }

  // 3. Erros de CPF e Dados Cadastrais
  if (lower.includes('cpf') || lower.includes('documento')) {
    return {
      title: 'CPF incompleto ou inválido',
      description: 'Os dados cadastrais do aluno precisam de correção.',
      cause: 'O CPF informado possui menos de 11 dígitos ou contém formato incorreto.',
      solution: 'Acesse o cadastro do aluno e informe um CPF válido com 11 dígitos.',
      actionText: 'Corrigir Cadastro',
      actionType: 'redirect'
    };
  }

  // 4. Erros de Fichas de Treino
  if (lower.includes('exercício') || lower.includes('ficha') || lower.includes('workout')) {
    return {
      title: 'Ficha de Treino precisa de atenção',
      description: 'Não foi possível salvar a ficha do aluno.',
      cause: 'A ficha atual não possui exercícios cadastrados ou há repetições pendentes.',
      solution: 'Adicione pelo menos 1 exercício e defina as séries antes de salvar.',
      actionText: 'Adicionar Exercício',
      actionType: 'focus'
    };
  }

  // 5. Erros do Asaas / Cobrança / Financeiro
  if (lower.includes('asaas') || lower.includes('pagamento') || lower.includes('fatura')) {
    return {
      title: 'Falha na integração financeira',
      description: 'A comunicação com o gateway de pagamentos não pôde ser concluída.',
      cause: 'Chave de API do Asaas ausente, cliente sem dados de endereço/telefone ou fatura já existente.',
      solution: 'Verifique se o aluno possui endereço completo cadastrado e confira a chave Asaas.',
      actionText: 'Revisar Dados Financeiros',
      actionType: 'redirect'
    };
  }

  // 6. Erros de Rede / Conexão Serverless / Timeout
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('500') || lower.includes('failed to fetch')) {
    return {
      title: 'Oscilação temporária de conexão',
      description: 'O servidor demorou para responder ou sua conexão oscilou.',
      cause: 'Instabilidade momentânea de internet ou renovação de sessão.',
      solution: 'Seus dados foram preservados com segurança. Clique abaixo para tentar novamente.',
      actionText: 'Reenviar Agora',
      actionType: 'retry'
    };
  }

  // 7. Erros de Autenticação / Sessão Expirada
  if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('403') || lower.includes('sessão')) {
    return {
      title: 'Sessão expirada',
      description: 'Seu tempo de login foi concluído por segurança.',
      cause: 'O token de acesso expirou após um período de inatividade.',
      solution: 'Faça login novamente para continuar exatamente de onde parou.',
      actionText: 'Entrar Novamente',
      actionType: 'redirect'
    };
  }

  // Fallback Padrão Amigável
  return {
    title: 'Não foi possível concluir a ação',
    description: msg || 'Ocorreu uma inconsistência ao processar sua solicitação.',
    cause: context ? `Contexto da operação: ${context}` : 'Os dados enviados não puderam ser validados pelo servidor.',
    solution: 'Verifique os campos preenchidos e tente novamente em instantes.',
    actionText: 'Tentar Novamente',
    actionType: 'retry'
  };
}

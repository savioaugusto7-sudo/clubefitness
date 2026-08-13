export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

export function validateContractClientData(client: any): ValidationResult {
  const missingFields: string[] = [];

  const pes = client?.dadosPessoais || client || {};
  const endereco = pes.endereco || {};

  if (!pes.nome?.trim()) {
    missingFields.push('Nome Completo');
  }

  if (!pes.cpf?.trim()) {
    missingFields.push('CPF');
  } else {
    // Basic verification of length or presence
    const cleanCpf = pes.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      missingFields.push('CPF (Formato inválido, deve conter 11 dígitos)');
    }
  }

  if (!pes.email?.trim()) {
    missingFields.push('E-mail');
  }

  if (!pes.telefone?.trim()) {
    missingFields.push('Telefone/WhatsApp');
  } else {
    const cleanPhone = pes.telefone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      missingFields.push('Telefone/WhatsApp (deve conter DDD e pelo menos 10 dígitos)');
    }
  }

  // Address check
  if (!pes.endereco?.trim()) {
    missingFields.push('Endereço (Rua/Avenida)');
  }
  if (!pes.numero?.trim()) {
    missingFields.push('Endereço (Número)');
  }
  if (!pes.bairro?.trim()) {
    missingFields.push('Endereço (Bairro)');
  }
  if (!pes.cidade?.trim()) {
    missingFields.push('Endereço (Cidade)');
  }
  if (!pes.estado?.trim()) {
    missingFields.push('Endereço (Estado/UF)');
  }
  if (!pes.cep?.trim()) {
    missingFields.push('Endereço (CEP)');
  } else {
    const cleanCep = pes.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      missingFields.push('Endereço (CEP inválido, deve conter 8 dígitos)');
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

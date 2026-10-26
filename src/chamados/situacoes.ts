import { Situacao } from '../generated/prisma/enums.js';

export const LIMITE_EM_ATENDIMENTO = 5;

// Aberto → Em atendimento → Resolvido → Fechado
// Resolvido → Em atendimento | Aberto/Em atendimento → Cancelado
const TRANSICOES: Record<Situacao, Situacao[]> = {
  ABERTO: ['EM_ATENDIMENTO', 'CANCELADO'],
  EM_ATENDIMENTO: ['RESOLVIDO', 'CANCELADO'],
  RESOLVIDO: ['FECHADO', 'EM_ATENDIMENTO'],
  FECHADO: [],
  CANCELADO: [],
};

export function transicaoPermitida(de: Situacao, para: Situacao): boolean {
  return TRANSICOES[de].includes(para);
}

export function estaEncerrado(situacao: Situacao): boolean {
  return situacao === 'FECHADO' || situacao === 'CANCELADO';
}

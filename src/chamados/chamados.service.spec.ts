import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChamadosService } from './chamados.service.js';
import { transicaoPermitida } from './situacoes.js';

function criarServico(overrides: Record<string, any> = {}) {
  const prisma: any = {
    chamado: { findUnique: vi.fn(), update: vi.fn((a) => a.data), count: vi.fn(async () => 0) },
    pessoa: { findUnique: vi.fn() },
    tipoProblema: { findUnique: vi.fn() },
    comentario: { create: vi.fn((a) => a.data) },
    ...overrides,
  };
  prisma.$transaction = (fn: any) => fn(prisma);
  return { service: new ChamadosService(prisma), prisma };
}

describe('transições de situação', () => {
  it('aceita apenas os caminhos previstos', () => {
    expect(transicaoPermitida('ABERTO', 'EM_ATENDIMENTO')).toBe(true);
    expect(transicaoPermitida('EM_ATENDIMENTO', 'RESOLVIDO')).toBe(true);
    expect(transicaoPermitida('RESOLVIDO', 'FECHADO')).toBe(true);
    expect(transicaoPermitida('RESOLVIDO', 'EM_ATENDIMENTO')).toBe(true);
    expect(transicaoPermitida('ABERTO', 'CANCELADO')).toBe(true);
    expect(transicaoPermitida('EM_ATENDIMENTO', 'CANCELADO')).toBe(true);
    expect(transicaoPermitida('ABERTO', 'RESOLVIDO')).toBe(false);
    expect(transicaoPermitida('RESOLVIDO', 'CANCELADO')).toBe(false);
    expect(transicaoPermitida('FECHADO', 'EM_ATENDIMENTO')).toBe(false);
    expect(transicaoPermitida('CANCELADO', 'ABERTO')).toBe(false);
  });
});

describe('ChamadosService', () => {
  const chamadoAberto = { id: 1, situacao: 'ABERTO', solicitanteId: 10, tecnicoId: null };
  const tecnico = { id: 20, tipo: 'TECNICO', ativo: true };

  it('designar técnico em chamado aberto inicia o atendimento', async () => {
    const { service, prisma } = criarServico();
    prisma.chamado.findUnique.mockResolvedValue(chamadoAberto);
    prisma.pessoa.findUnique.mockResolvedValue(tecnico);
    const r = await service.designarTecnico(1, 20);
    expect(r).toMatchObject({ tecnicoId: 20, situacao: 'EM_ATENDIMENTO' });
  });

  it('recusa técnico inativo', async () => {
    const { service, prisma } = criarServico();
    prisma.chamado.findUnique.mockResolvedValue(chamadoAberto);
    prisma.pessoa.findUnique.mockResolvedValue({ ...tecnico, ativo: false });
    await expect(service.designarTecnico(1, 20)).rejects.toThrow(ConflictException);
  });

  it('recusa técnico com 5 chamados em atendimento', async () => {
    const { service, prisma } = criarServico();
    prisma.chamado.findUnique.mockResolvedValue(chamadoAberto);
    prisma.pessoa.findUnique.mockResolvedValue(tecnico);
    prisma.chamado.count.mockResolvedValue(5);
    await expect(service.designarTecnico(1, 20)).rejects.toThrow(/5 chamados/);
  });

  it('recusa atender o próprio chamado', async () => {
    const { service, prisma } = criarServico();
    prisma.chamado.findUnique.mockResolvedValue(chamadoAberto);
    prisma.pessoa.findUnique.mockResolvedValue({ ...tecnico, id: 10 });
    await expect(service.designarTecnico(1, 10)).rejects.toThrow(/próprio chamado/);
  });

  it('registra o momento da resolução', async () => {
    const { service, prisma } = criarServico();
    prisma.chamado.findUnique.mockResolvedValue({ ...chamadoAberto, situacao: 'EM_ATENDIMENTO', tecnicoId: 20 });
    const r: any = await service.mudarSituacao(1, 'RESOLVIDO');
    expect(r.resolvidoEm).toBeInstanceOf(Date);
  });

  it('não altera chamado fechado nem aceita comentário nele', async () => {
    const { service, prisma } = criarServico();
    prisma.chamado.findUnique.mockResolvedValue({ ...chamadoAberto, situacao: 'FECHADO' });
    await expect(service.atualizar(1, { titulo: 'Novo título' })).rejects.toThrow(/encerrado/);
    await expect(service.comentar(1, { autorId: 10, texto: 'oi' })).rejects.toThrow(/encerrado/);
  });

  it('só solicitante e técnico responsável comentam', async () => {
    const { service, prisma } = criarServico();
    prisma.chamado.findUnique.mockResolvedValue({ ...chamadoAberto, situacao: 'EM_ATENDIMENTO', tecnicoId: 20 });
    prisma.pessoa.findUnique.mockResolvedValue({ id: 99, ativo: true });
    await expect(service.comentar(1, { autorId: 99, texto: 'oi' })).rejects.toThrow(/podem comentar/);
    prisma.pessoa.findUnique.mockResolvedValue({ id: 20, ativo: true });
    await expect(service.comentar(1, { autorId: 20, texto: 'oi' })).resolves.toMatchObject({ autorId: 20 });
  });

  it('não abre chamado em tipo de problema desativado', async () => {
    const { service, prisma } = criarServico();
    prisma.pessoa.findUnique.mockResolvedValue({ id: 10, tipo: 'SOLICITANTE', ativo: true });
    prisma.tipoProblema.findUnique.mockResolvedValue({ id: 1, ativo: false });
    await expect(
      service.criar({ titulo: 'Rede caiu', descricao: 'A rede caiu no setor', tipoProblemaId: 1, solicitanteId: 10 }),
    ).rejects.toThrow(/desativado/);
  });
});

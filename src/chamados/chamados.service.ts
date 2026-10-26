import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prioridade, Situacao } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';
import { CriarChamadoDto } from './dto/criar-chamado.dto.js';
import { CriarComentarioDto } from './dto/criar-comentario.dto.js';
import { estaEncerrado, LIMITE_EM_ATENDIMENTO, transicaoPermitida } from './situacoes.js';

export interface FiltrosChamado {
  situacao?: Situacao;
  prioridade?: Prioridade;
  tipoProblemaId?: number;
  tecnicoId?: number;
}

@Injectable()
export class ChamadosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarChamadoDto) {
    const solicitante = await this.prisma.pessoa.findUnique({ where: { id: dto.solicitanteId } });
    if (!solicitante) throw new NotFoundException(`Pessoa ${dto.solicitanteId} não encontrada`);
    if (solicitante.tipo !== 'SOLICITANTE') {
      throw new BadRequestException('Quem abre o chamado deve ser um solicitante');
    }
    if (!solicitante.ativo) {
      throw new ConflictException('Pessoa inativa não pode abrir chamados');
    }

    const tipo = await this.prisma.tipoProblema.findUnique({ where: { id: dto.tipoProblemaId } });
    if (!tipo) throw new NotFoundException(`Tipo de problema ${dto.tipoProblemaId} não encontrado`);
    if (!tipo.ativo) {
      throw new ConflictException('Não é possível abrir chamado em um tipo de problema desativado');
    }

    return this.prisma.chamado.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        prioridade: dto.prioridade ?? 'MEDIA',
        tipoProblemaId: dto.tipoProblemaId,
        solicitanteId: dto.solicitanteId,
      },
    });
  }

  listar(filtros: FiltrosChamado) {
    return this.prisma.chamado.findMany({
      where: {
        situacao: filtros.situacao,
        prioridade: filtros.prioridade,
        tipoProblemaId: filtros.tipoProblemaId,
        tecnicoId: filtros.tecnicoId,
      },
      orderBy: { id: 'asc' },
    });
  }

  async buscar(id: number) {
    const chamado = await this.prisma.chamado.findUnique({
      where: { id },
      include: {
        tipoProblema: true,
        solicitante: true,
        tecnico: true,
        comentarios: { orderBy: { id: 'asc' }, include: { autor: true } },
      },
    });
    if (!chamado) throw new NotFoundException(`Chamado ${id} não encontrado`);
    return chamado;
  }

  async atualizar(id: number, dto: AtualizarChamadoDto) {
    const chamado = await this.obterBasico(id);
    this.garantirNaoEncerrado(chamado.situacao);
    return this.prisma.chamado.update({ where: { id }, data: dto });
  }

  async designarTecnico(id: number, tecnicoId: number) {
    return this.prisma.$transaction(async (tx) => {
      const chamado = await tx.chamado.findUnique({ where: { id } });
      if (!chamado) throw new NotFoundException(`Chamado ${id} não encontrado`);
      this.garantirNaoEncerrado(chamado.situacao);
      if (chamado.situacao === 'RESOLVIDO') {
        throw new ConflictException(
          'Chamado resolvido não pode receber novo técnico; reabra o atendimento primeiro',
        );
      }

      const tecnico = await tx.pessoa.findUnique({ where: { id: tecnicoId } });
      if (!tecnico) throw new NotFoundException(`Pessoa ${tecnicoId} não encontrada`);
      if (tecnico.tipo !== 'TECNICO') {
        throw new BadRequestException('Apenas um técnico pode ser designado para atender');
      }
      if (!tecnico.ativo) {
        throw new ConflictException('Técnico inativo não pode ser designado');
      }
      if (tecnico.id === chamado.solicitanteId) {
        throw new ConflictException('Ninguém pode atender o próprio chamado');
      }
      if (chamado.tecnicoId === tecnicoId) return chamado;

      await this.garantirLimiteDoTecnico(tx, tecnicoId);

      return tx.chamado.update({
        where: { id },
        data: { tecnicoId, situacao: 'EM_ATENDIMENTO' },
      });
    });
  }

  async mudarSituacao(id: number, nova: Situacao) {
    return this.prisma.$transaction(async (tx) => {
      const chamado = await tx.chamado.findUnique({ where: { id } });
      if (!chamado) throw new NotFoundException(`Chamado ${id} não encontrado`);

      if (!transicaoPermitida(chamado.situacao, nova)) {
        throw new ConflictException(
          `Transição de ${chamado.situacao} para ${nova} não é permitida`,
        );
      }

      if (nova === 'EM_ATENDIMENTO') {
        if (chamado.tecnicoId === null) {
          throw new ConflictException(
            'Chamado sem técnico: designe um técnico para iniciar o atendimento',
          );
        }
        await this.garantirLimiteDoTecnico(tx, chamado.tecnicoId);
      }

      return tx.chamado.update({
        where: { id },
        data: { situacao: nova, ...(nova === 'RESOLVIDO' && { resolvidoEm: new Date() }) },
      });
    });
  }

  async comentar(chamadoId: number, dto: CriarComentarioDto) {
    const chamado = await this.obterBasico(chamadoId);
    this.garantirNaoEncerrado(chamado.situacao);

    const autor = await this.prisma.pessoa.findUnique({ where: { id: dto.autorId } });
    if (!autor) throw new NotFoundException(`Pessoa ${dto.autorId} não encontrada`);
    if (!autor.ativo) throw new ConflictException('Pessoa inativa não pode comentar');
    if (autor.id !== chamado.solicitanteId && autor.id !== chamado.tecnicoId) {
      throw new ConflictException(
        'Só o solicitante e o técnico responsável podem comentar neste chamado',
      );
    }

    return this.prisma.comentario.create({
      data: { chamadoId, autorId: dto.autorId, texto: dto.texto },
    });
  }

  private async obterBasico(id: number) {
    const chamado = await this.prisma.chamado.findUnique({ where: { id } });
    if (!chamado) throw new NotFoundException(`Chamado ${id} não encontrado`);
    return chamado;
  }

  private garantirNaoEncerrado(situacao: Situacao) {
    if (estaEncerrado(situacao)) {
      throw new ConflictException('Chamado encerrado (fechado ou cancelado) não pode mais ser alterado');
    }
  }

  private async garantirLimiteDoTecnico(
    tx: Pick<PrismaService, 'chamado'>,
    tecnicoId: number,
  ) {
    const emAtendimento = await tx.chamado.count({
      where: { tecnicoId, situacao: 'EM_ATENDIMENTO' },
    });
    if (emAtendimento >= LIMITE_EM_ATENDIMENTO) {
      throw new ConflictException(
        `O técnico já tem ${LIMITE_EM_ATENDIMENTO} chamados em atendimento`,
      );
    }
  }
}

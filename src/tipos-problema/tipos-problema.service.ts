import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarTipoProblemaDto } from './dto/atualizar-tipo-problema.dto.js';
import { CriarTipoProblemaDto } from './dto/criar-tipo-problema.dto.js';

@Injectable()
export class TiposProblemaService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarTipoProblemaDto) {
    await this.garantirNomeLivre(dto.nome);
    return this.prisma.tipoProblema.create({ data: dto });
  }

  listar() {
    return this.prisma.tipoProblema.findMany({ orderBy: { id: 'asc' } });
  }

  async buscar(id: number) {
    const tipo = await this.prisma.tipoProblema.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException(`Tipo de problema ${id} não encontrado`);
    return tipo;
  }

  async atualizar(id: number, dto: AtualizarTipoProblemaDto) {
    await this.buscar(id);
    if (dto.nome) await this.garantirNomeLivre(dto.nome, id);
    return this.prisma.tipoProblema.update({ where: { id }, data: dto });
  }

  async remover(id: number) {
    await this.buscar(id);
    const usos = await this.prisma.chamado.count({ where: { tipoProblemaId: id } });
    if (usos > 0) {
      throw new ConflictException(
        'Tipo de problema já usado em chamados não pode ser removido; desative-o (ativo: false)',
      );
    }
    return this.prisma.tipoProblema.delete({ where: { id } });
  }

  private async garantirNomeLivre(nome: string, ignorarId?: number) {
    const existente = await this.prisma.tipoProblema.findUnique({ where: { nome } });
    if (existente && existente.id !== ignorarId) {
      throw new ConflictException(`Já existe um tipo de problema chamado "${nome}"`);
    }
  }
}

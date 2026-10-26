import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto.js';
import { CriarPessoaDto } from './dto/criar-pessoa.dto.js';

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarPessoaDto) {
    await this.garantirEmailLivre(dto.email);
    return this.prisma.pessoa.create({ data: dto });
  }

  listar() {
    return this.prisma.pessoa.findMany({ orderBy: { id: 'asc' } });
  }

  async buscar(id: number) {
    const pessoa = await this.prisma.pessoa.findUnique({ where: { id } });
    if (!pessoa) throw new NotFoundException(`Pessoa ${id} não encontrada`);
    return pessoa;
  }

  async atualizar(id: number, dto: AtualizarPessoaDto) {
    await this.buscar(id);
    if (dto.email) await this.garantirEmailLivre(dto.email, id);
    return this.prisma.pessoa.update({ where: { id }, data: dto });
  }

  async remover(id: number) {
    await this.buscar(id);
    const envolvimentos = await this.prisma.chamado.count({
      where: { OR: [{ solicitanteId: id }, { tecnicoId: id }] },
    });
    const comentarios = await this.prisma.comentario.count({ where: { autorId: id } });
    if (envolvimentos + comentarios > 0) {
      throw new ConflictException(
        'Pessoa envolvida em chamados não pode ser removida; desative-a (ativo: false)',
      );
    }
    return this.prisma.pessoa.delete({ where: { id } });
  }

  private async garantirEmailLivre(email: string, ignorarId?: number) {
    const existente = await this.prisma.pessoa.findUnique({ where: { email } });
    if (existente && existente.id !== ignorarId) {
      throw new ConflictException(`O e-mail ${email} já está cadastrado`);
    }
  }
}

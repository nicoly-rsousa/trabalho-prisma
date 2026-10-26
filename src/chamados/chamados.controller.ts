import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Prioridade, Situacao } from '../generated/prisma/enums.js';
import { ChamadosService } from './chamados.service.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';
import { CriarChamadoDto } from './dto/criar-chamado.dto.js';
import { CriarComentarioDto } from './dto/criar-comentario.dto.js';
import { DesignarTecnicoDto } from './dto/designar-tecnico.dto.js';
import { MudarSituacaoDto } from './dto/mudar-situacao.dto.js';

@Controller('chamados')
export class ChamadosController {
  constructor(private readonly chamadosService: ChamadosService) {}

  @Post()
  criar(@Body() dto: CriarChamadoDto) {
    return this.chamadosService.criar(dto);
  }

  @Get()
  listar(
    @Query('situacao', new ParseEnumPipe(Situacao, { optional: true })) situacao?: Situacao,
    @Query('prioridade', new ParseEnumPipe(Prioridade, { optional: true })) prioridade?: Prioridade,
    @Query('tipoProblemaId', new ParseIntPipe({ optional: true })) tipoProblemaId?: number,
    @Query('tecnicoId', new ParseIntPipe({ optional: true })) tecnicoId?: number,
  ) {
    return this.chamadosService.listar({ situacao, prioridade, tipoProblemaId, tecnicoId });
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.chamadosService.buscar(id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarChamadoDto) {
    return this.chamadosService.atualizar(id, dto);
  }

  @Post(':id/designar')
  designar(@Param('id', ParseIntPipe) id: number, @Body() dto: DesignarTecnicoDto) {
    return this.chamadosService.designarTecnico(id, dto.tecnicoId);
  }

  @Post(':id/situacao')
  mudarSituacao(@Param('id', ParseIntPipe) id: number, @Body() dto: MudarSituacaoDto) {
    return this.chamadosService.mudarSituacao(id, dto.situacao);
  }

  @Post(':id/comentarios')
  comentar(@Param('id', ParseIntPipe) id: number, @Body() dto: CriarComentarioDto) {
    return this.chamadosService.comentar(id, dto);
  }
}

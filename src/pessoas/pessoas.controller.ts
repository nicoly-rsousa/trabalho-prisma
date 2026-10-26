import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto.js';
import { CriarPessoaDto } from './dto/criar-pessoa.dto.js';
import { PessoasService } from './pessoas.service.js';

@Controller('pessoas')
export class PessoasController {
  constructor(private readonly pessoasService: PessoasService) {}

  @Post()
  criar(@Body() dto: CriarPessoaDto) {
    return this.pessoasService.criar(dto);
  }

  @Get()
  listar() {
    return this.pessoasService.listar();
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.pessoasService.buscar(id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarPessoaDto) {
    return this.pessoasService.atualizar(id, dto);
  }

  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.pessoasService.remover(id);
  }
}

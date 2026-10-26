import { Module } from '@nestjs/common';
import { ChamadosModule } from './chamados/chamados.module.js';
import { PessoasModule } from './pessoas/pessoas.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TiposProblemaModule } from './tipos-problema/tipos-problema.module.js';

@Module({
  imports: [PrismaModule, PessoasModule, TiposProblemaModule, ChamadosModule],
})
export class AppModule {}

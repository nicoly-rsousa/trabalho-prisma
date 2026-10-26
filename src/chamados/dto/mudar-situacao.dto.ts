import { IsEnum } from 'class-validator';
import { Situacao } from '../../generated/prisma/enums.js';

export class MudarSituacaoDto {
  @IsEnum(Situacao, {
    message: 'A situação deve ser ABERTO, EM_ATENDIMENTO, RESOLVIDO, FECHADO ou CANCELADO',
  })
  situacao: Situacao;
}

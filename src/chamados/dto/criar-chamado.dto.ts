import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Prioridade } from '../../generated/prisma/enums.js';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CriarChamadoDto {
  @Transform(aparar)
  @IsString({ message: 'O título deve ser um texto' })
  @MinLength(5, { message: 'O título deve ter no mínimo 5 caracteres' })
  @MaxLength(100, { message: 'O título deve ter no máximo 100 caracteres' })
  titulo: string;

  @Transform(aparar)
  @IsString({ message: 'A descrição deve ser um texto' })
  @MinLength(10, { message: 'A descrição deve ter no mínimo 10 caracteres' })
  descricao: string;

  @IsOptional()
  @IsEnum(Prioridade, { message: 'A prioridade deve ser BAIXA, MEDIA, ALTA ou CRITICA' })
  prioridade?: Prioridade;

  @IsInt({ message: 'tipoProblemaId deve ser um número inteiro' })
  tipoProblemaId: number;

  @IsInt({ message: 'solicitanteId deve ser um número inteiro' })
  solicitanteId: number;
}

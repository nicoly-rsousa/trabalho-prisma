import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TipoPessoa } from '../../generated/prisma/enums.js';

export class CriarPessoaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'O e-mail deve ter um formato válido' })
  email: string;

  @IsEnum(TipoPessoa, { message: 'O tipo deve ser SOLICITANTE ou TECNICO' })
  tipo: TipoPessoa;

  @IsOptional()
  @IsBoolean({ message: 'ativo deve ser verdadeiro ou falso' })
  ativo?: boolean;
}

import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// O tipo (solicitante/técnico) não pode ser alterado depois do cadastro.
export class AtualizarPessoaDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'O e-mail deve ter um formato válido' })
  email?: string;

  @IsOptional()
  @IsBoolean({ message: 'ativo deve ser verdadeiro ou falso' })
  ativo?: boolean;
}

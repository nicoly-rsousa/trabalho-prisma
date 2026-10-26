import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CriarComentarioDto {
  @IsInt({ message: 'autorId deve ser um número inteiro' })
  autorId: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O comentário deve ser um texto' })
  @IsNotEmpty({ message: 'O comentário não pode ser vazio' })
  texto: string;
}

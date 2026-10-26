import { IsInt } from 'class-validator';

export class DesignarTecnicoDto {
  @IsInt({ message: 'tecnicoId deve ser um número inteiro' })
  tecnicoId: number;
}

import { IsString, IsOptional, IsArray, IsNumber, Min, Max, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class IngredientDto {
  @IsString() name: string;
  @IsNumber() amount: number;
  @IsString() unit: string;
}

export class StepDto {
  @IsNumber() order: number;
  @IsString() text: string;
}

export class CreateRecipeDto {
  @IsString() title: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsArray() @Type(() => IngredientDto)
  ingredients?: IngredientDto[];

  @IsOptional() @IsArray() @Type(() => StepDto)
  steps?: StepDto[];

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsMongoId()
  categoryId?: string;

  @IsOptional() @IsNumber() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @IsNumber() @Min(0)
  prepTime?: number;

  @IsOptional() @IsNumber() @Min(0)
  cookTime?: number;

  @IsOptional() @IsNumber() @Min(1)
  servings?: number;
}

export class RecipeQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsMongoId() category?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number = 20;
}

import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CategoriesService } from './categories.service';
import { Public } from '../common/decorators/public.decorator';

class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() icon?: string;
}

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiBearerAuth()
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto.name, dto.icon);
  }
}

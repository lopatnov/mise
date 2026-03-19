import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

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

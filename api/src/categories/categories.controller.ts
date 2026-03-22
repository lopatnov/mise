import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'List all recipe categories' })
  @ApiResponse({ status: 200, description: 'Array of categories with name, icon, and slug' })
  findAll() {
    return this.service.findAll();
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new category (admin use)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto.name, dto.icon);
  }
}

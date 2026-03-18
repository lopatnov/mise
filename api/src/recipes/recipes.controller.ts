import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { UploadsService } from '../uploads/uploads.service';

import { CreateRecipeDto, RecipeQueryDto } from './dto/recipe.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('recipes')
@ApiBearerAuth()
@Controller('recipes')
export class RecipesController {
  constructor(
    private service: RecipesService,
    private uploadsService: UploadsService,
  ) {}

  @Get()
  findAll(@Request() req: any, @Query() query: RecipeQueryDto) {
    return this.service.findAll(req.user.userId, query);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateRecipeDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: Partial<CreateRecipeDto>,
  ) {
    return this.service.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user.userId);
  }

  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_, file, cb) =>
          cb(null, `${uuidv4()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhoto(
    @Param('id') id: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const photoUrl = this.uploadsService.buildPhotoUrl(file.filename);
    return this.service.setPhoto(id, req.user.userId, photoUrl);
  }
}

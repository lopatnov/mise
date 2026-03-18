import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RecipesService } from './recipes.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateRecipeDto, RecipeQueryDto } from './dto/recipe.dto';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('recipes')
@ApiBearerAuth()
@Controller('recipes')
export class RecipesController {
  constructor(
    private service: RecipesService,
    private uploadsService: UploadsService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: RecipeQueryDto) {
    return this.service.findAll(user.userId, query);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRecipeDto) {
    return this.service.create(user.userId, dto);
  }

  @Public()
  @Get('public')
  findPublic(@Query() query: RecipeQueryDto) {
    return this.service.findPublic(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: Partial<CreateRecipeDto>,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user.userId);
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
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const photoUrl = this.uploadsService.buildPhotoUrl(file.filename);
    return this.service.setPhoto(id, user.userId, photoUrl);
  }

  @Post(':id/steps/:order/photo')
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
  uploadStepPhoto(
    @Param('id') id: string,
    @Param('order') order: string,
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const photoUrl = this.uploadsService.buildPhotoUrl(file.filename);
    return this.service.setStepPhoto(id, user.userId, Number(order), photoUrl);
  }
}

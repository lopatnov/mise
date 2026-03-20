import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUser, type JwtUser } from '../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../common/decorators/public.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { CreateRecipeDto, RecipeQueryDto } from './dto/recipe.dto';
import { RecipesService } from './recipes.service';

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
    return this.service.findAll(user.userId, user.role === 'admin', query);
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

  @Public()
  @Get('tags')
  getTags() {
    return this.service.findAllTags();
  }

  @OptionalAuth()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser | null) {
    return this.service.findOne(id, user?.userId, user?.role === 'admin');
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: JwtUser, @Body() dto: Partial<CreateRecipeDto>) {
    return this.service.update(id, user.userId, user.role === 'admin', dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user.userId, user.role === 'admin');
  }

  @Post(':id/favorite')
  addFavorite(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.addFavorite(id, user.userId);
  }

  @Delete(':id/favorite')
  removeFavorite(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.removeFavorite(id, user.userId);
  }

  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_, file, cb) => cb(null, `${uuidv4()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhoto(@Param('id') id: string, @CurrentUser() user: JwtUser, @UploadedFile() file: Express.Multer.File) {
    const photoUrl = this.uploadsService.buildPhotoUrl(file.filename);
    return this.service.setPhoto(id, user.userId, user.role === 'admin', photoUrl);
  }

  @Post(':id/steps/:order/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_, file, cb) => cb(null, `${uuidv4()}${extname(file.originalname)}`),
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
    return this.service.setStepPhoto(id, user.userId, user.role === 'admin', Number(order), photoUrl);
  }
}

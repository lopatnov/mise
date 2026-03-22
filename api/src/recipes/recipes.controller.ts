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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUser, type JwtUser } from '../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../common/decorators/public.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { CreateRecipeDto, ImportUrlDto, RecipeQueryDto } from './dto/recipe.dto';
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
  @ApiOperation({ summary: 'List recipes for the authenticated user (own + public from others)' })
  @ApiResponse({ status: 200, description: 'Paginated recipe list with total count' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: JwtUser, @Query() query: RecipeQueryDto) {
    return this.service.findAll(user.userId, user.role === 'admin', query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new recipe' })
  @ApiResponse({ status: 201, description: 'Created recipe with generated slug' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRecipeDto) {
    return this.service.create(user.userId, dto);
  }

  @Post('import-url')
  @ApiOperation({ summary: 'Import a recipe from an external URL (JSON-LD / OG scraping)' })
  @ApiResponse({ status: 201, description: 'Parsed recipe data (not saved — returned for editing)' })
  @ApiResponse({ status: 400, description: 'Invalid URL or failed to parse recipe' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  importFromUrl(@Body() dto: ImportUrlDto) {
    return this.service.importFromUrl(dto.url);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List all public recipes (no auth required)' })
  @ApiResponse({ status: 200, description: 'Paginated list of public recipes' })
  findPublic(@Query() query: RecipeQueryDto) {
    return this.service.findPublic(query);
  }

  @OptionalAuth()
  @Get('tags')
  @ApiOperation({ summary: 'Get distinct tags visible to the current user' })
  @ApiResponse({ status: 200, description: 'Array of tag strings' })
  getTags(@CurrentUser() user: JwtUser | null) {
    return this.service.findAllTags(user?.userId, user?.role === 'admin');
  }

  @OptionalAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single recipe by ID or slug' })
  @ApiResponse({ status: 200, description: 'Recipe detail' })
  @ApiResponse({ status: 403, description: 'Recipe is private and requester is not the owner' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser | null) {
    return this.service.findOne(id, user?.userId, user?.role === 'admin');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recipe (owner or admin)' })
  @ApiResponse({ status: 200, description: 'Updated recipe' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the recipe owner' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  update(@Param('id') id: string, @CurrentUser() user: JwtUser, @Body() dto: Partial<CreateRecipeDto>) {
    return this.service.update(id, user.userId, user.role === 'admin', dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recipe (owner or admin)' })
  @ApiResponse({ status: 200, description: 'Recipe deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the recipe owner' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user.userId, user.role === 'admin');
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Add recipe to favourites (savedBy)' })
  @ApiResponse({ status: 201, description: '{ saved: true }' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  addFavorite(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.addFavorite(id, user.userId);
  }

  @Delete(':id/favorite')
  @ApiOperation({ summary: 'Remove recipe from favourites' })
  @ApiResponse({ status: 200, description: '{ saved: false }' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  removeFavorite(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.removeFavorite(id, user.userId);
  }

  @Post(':id/photo')
  @ApiOperation({ summary: 'Upload or replace the main recipe photo' })
  @ApiResponse({ status: 201, description: 'Updated recipe with new photoUrl' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the recipe owner' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
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
  @ApiOperation({ summary: 'Upload or replace a photo for a specific recipe step' })
  @ApiResponse({ status: 201, description: 'Updated recipe with step photoUrl' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the recipe owner' })
  @ApiResponse({ status: 404, description: 'Recipe or step not found' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
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

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsModule } from '../uploads/uploads.module';
import { Recipe, RecipeSchema } from './recipe.schema';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Recipe.name, schema: RecipeSchema }]), UploadsModule],
  providers: [RecipesService],
  controllers: [RecipesController],
})
export class RecipesModule {}

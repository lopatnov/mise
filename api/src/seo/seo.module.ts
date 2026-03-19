import { Module } from '@nestjs/common';
import { RecipesModule } from '../recipes/recipes.module';
import { SeoController } from './seo.controller';

@Module({
  imports: [RecipesModule],
  controllers: [SeoController],
})
export class SeoModule {}

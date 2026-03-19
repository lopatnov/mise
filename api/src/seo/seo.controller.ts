import { Controller, Get, Header, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { RecipesService } from '../recipes/recipes.service';

@Controller()
export class SeoController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots(): string {
    const appUrl = this.config.get<string>('APP_URL');
    const lines = [
      'User-agent: *',
      'Allow: /',
      'Allow: /recipes/',
      'Allow: /uploads/',
      'Disallow: /admin',
      'Disallow: /profile',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /setup',
      'Disallow: /forgot-password',
      'Disallow: /reset-password',
      'Disallow: /api/',
    ];
    if (appUrl) lines.push(`Sitemap: ${appUrl}/sitemap.xml`);
    return lines.join('\n');
  }

  @Public()
  @Get('sitemap.xml')
  async sitemap(@Res() res: Response): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL') ?? '';
    const recipes = await this.recipesService.findPublicForSitemap();

    const recipeUrls = recipes
      .map(
        (r) =>
          `  <url>\n    <loc>${appUrl}/recipes/${String(r._id)}</loc>\n    <lastmod>${r.updatedAt.toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
      )
      .join('\n');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      `  <url><loc>${appUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      recipeUrls,
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }
}

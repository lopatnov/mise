import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { RecipeImportService } from './recipe-import.service';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

describe('RecipesController', () => {
  let controller: RecipesController;
  const user: JwtUser = { userId: 'u1', role: 'user' } as JwtUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipesController],
      providers: [
        { provide: RecipesService, useValue: { setPhoto: jest.fn(), setStepPhoto: jest.fn() } },
        { provide: RecipeImportService, useValue: {} },
        { provide: UploadsService, useValue: { buildPhotoUrl: jest.fn((f: string) => `/uploads/${f}`) } },
      ],
    }).compile();

    controller = module.get<RecipesController>(RecipesController);
  });

  // ── uploadPhoto / uploadStepPhoto: rejected/missing file ───────────────────

  describe('uploadPhoto', () => {
    it('rejects a missing file instead of throwing on file.filename', () => {
      expect(() => controller.uploadPhoto('r1', user, undefined)).toThrow(BadRequestException);
    });
  });

  describe('uploadStepPhoto', () => {
    it('rejects a missing file instead of throwing on file.filename', () => {
      expect(() => controller.uploadStepPhoto('r1', '1', user, undefined)).toThrow(BadRequestException);
    });
  });
});

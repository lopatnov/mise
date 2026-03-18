import { Injectable, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService implements OnModuleInit {
  onModuleInit() {
    mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });
  }

  buildPhotoUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}

import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { photoUploadOptions } from './photo-upload.options';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('photo')
  @ApiOperation({ summary: 'Upload a standalone photo (returns URL for use in recipe form)' })
  @ApiResponse({ status: 201, description: 'Returns { photoUrl } path' })
  @ApiResponse({ status: 400, description: 'No file or invalid MIME type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('photo', photoUploadOptions))
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return { photoUrl: this.uploadsService.buildPhotoUrl(file.filename) };
  }
}

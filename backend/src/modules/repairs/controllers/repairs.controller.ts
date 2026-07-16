import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairsService } from '../services/repairs.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { extname } from 'node:path';

function buildUploadName(originalName: string): string {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${uniqueSuffix}${extname(originalName)}`;
}

function toUploadedPath(file?: { filename?: string }): string | undefined {
  return file ? `/uploads/${file.filename}` : undefined;
}

type UploadFile = { filename: string; originalname: string };
type UploadFields = { failPicture?: UploadFile[]; evidencePicture?: UploadFile[] };

@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'failPicture', maxCount: 1 },
        { name: 'evidencePicture', maxCount: 1 },
      ],
      {
        storage: require('multer').diskStorage({
          destination: './uploads',
          filename: (_request: unknown, file: UploadFile, callback: (error: Error | null, filename: string) => void) =>
            callback(null, buildUploadName(file.originalname)),
        }),
      },
    ),
  )
  create(@Body() createRepairDto: CreateRepairDto, @UploadedFiles() files: UploadFields) {
    createRepairDto.failPicture = toUploadedPath(files.failPicture?.[0]) ?? createRepairDto.failPicture ?? undefined;
    createRepairDto.evidencePicture = toUploadedPath(files.evidencePicture?.[0]) ?? createRepairDto.evidencePicture ?? undefined;
    return this.repairsService.create(createRepairDto);
  }

  @Get()
  findAll() {
    return this.repairsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const repair = await this.repairsService.findById(id);

    if (!repair) {
      throw new NotFoundException(`Repair ${id} not found`);
    }

    return repair;
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'failPicture', maxCount: 1 },
        { name: 'evidencePicture', maxCount: 1 },
      ],
      {
        storage: require('multer').diskStorage({
          destination: './uploads',
          filename: (_request: unknown, file: UploadFile, callback: (error: Error | null, filename: string) => void) =>
            callback(null, buildUploadName(file.originalname)),
        }),
      },
    ),
  )
  async update(
    @Param('id') id: string,
    @Body() updateRepairDto: UpdateRepairDto,
    @UploadedFiles() files: UploadFields,
  ) {
    updateRepairDto.failPicture = toUploadedPath(files.failPicture?.[0]) ?? updateRepairDto.failPicture;
    updateRepairDto.evidencePicture = toUploadedPath(files.evidencePicture?.[0]) ?? updateRepairDto.evidencePicture;

    const repair = await this.repairsService.update(id, updateRepairDto);

    if (!repair) {
      throw new NotFoundException(`Repair ${id} not found`);
    }

    return repair;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.repairsService.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Repair ${id} not found`);
    }

    return { deleted: true };
  }
}


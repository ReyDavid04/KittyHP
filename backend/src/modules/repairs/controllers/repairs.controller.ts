import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { extname } from 'node:path';
import { AuthGuard } from '../../auth/auth.guard';
import { CreateRepairCatalogItemDto } from '../dto/create-repair-catalog-item.dto';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairCatalogItemDto } from '../dto/update-repair-catalog-item.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairsService } from '../services/repairs.service';

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
@UseGuards(AuthGuard)
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

  @Get('catalogs')
  getCatalogs() {
    return this.repairsService.getCatalogs();
  }

  @Get('catalog-items/:type')
  getCatalogItems(@Param('type') type: string) {
    return this.repairsService.getCatalogItems(type);
  }

  @Post('catalog-items/:type')
  createCatalogItem(
    @Param('type') type: string,
    @Body() createCatalogItemDto: CreateRepairCatalogItemDto,
  ) {
    return this.repairsService.createCatalogItem(type, createCatalogItemDto);
  }

  @Patch('catalog-items/:type/:catalogItemId')
  updateCatalogItem(
    @Param('type') type: string,
    @Param('catalogItemId') catalogItemId: string,
    @Body() updateCatalogItemDto: UpdateRepairCatalogItemDto,
  ) {
    return this.repairsService.updateCatalogItem(type, catalogItemId, updateCatalogItemDto);
  }

  @Delete('catalog-items/:type/:catalogItemId')
  deleteCatalogItem(
    @Param('type') type: string,
    @Param('catalogItemId') catalogItemId: string,
  ) {
    return this.repairsService.deleteCatalogItem(type, catalogItemId);
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

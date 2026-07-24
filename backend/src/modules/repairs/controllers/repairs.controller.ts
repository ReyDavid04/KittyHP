import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'node:path';
import { EditorGuard } from '../../auth/editor.guard';
import { AuthGuard, RequestWithAuth } from '../../auth/auth.guard';
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

function mergeUploadedPaths(existing: string | null | undefined, files: UploadFile[] | undefined): string | undefined {
  const previous = existing ? (() => { try { const parsed = JSON.parse(existing); return Array.isArray(parsed) ? parsed : [existing]; } catch { return [existing]; } })() : [];
  const uploaded = (files ?? []).map(toUploadedPath).filter((path): path is string => Boolean(path));
  return existing !== undefined || uploaded.length ? JSON.stringify([...previous, ...uploaded]) : undefined;
}

type UploadFile = { filename: string; originalname: string };
type UploadFields = { failPicture?: UploadFile[]; evidencePicture?: UploadFile[] };

@Controller('repairs')
@UseGuards(AuthGuard)
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @UseGuards(EditorGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'failPicture', maxCount: 10 },
        { name: 'evidencePicture', maxCount: 10 },
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
  create(
    @Body() createRepairDto: CreateRepairDto,
    @UploadedFiles() files: UploadFields,
    @Req() request: RequestWithAuth,
  ) {
    createRepairDto.failPicture = mergeUploadedPaths(createRepairDto.failPicture, files.failPicture);
    createRepairDto.evidencePicture = mergeUploadedPaths(createRepairDto.evidencePicture, files.evidencePicture);
    return this.repairsService.create(createRepairDto, request.user!.id);
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
  @UseGuards(EditorGuard)
  createCatalogItem(
    @Param('type') type: string,
    @Body() createCatalogItemDto: CreateRepairCatalogItemDto,
  ) {
    return this.repairsService.createCatalogItem(type, createCatalogItemDto);
  }

  @Patch('catalog-items/:type/:catalogItemId')
  @UseGuards(EditorGuard)
  updateCatalogItem(
    @Param('type') type: string,
    @Param('catalogItemId') catalogItemId: string,
    @Body() updateCatalogItemDto: UpdateRepairCatalogItemDto,
  ) {
    return this.repairsService.updateCatalogItem(type, catalogItemId, updateCatalogItemDto);
  }

  @Delete('catalog-items/:type/:catalogItemId')
  @UseGuards(EditorGuard)
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
  @UseGuards(EditorGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'failPicture', maxCount: 10 },
        { name: 'evidencePicture', maxCount: 10 },
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
    updateRepairDto.failPicture = mergeUploadedPaths(updateRepairDto.failPicture, files.failPicture);
    updateRepairDto.evidencePicture = mergeUploadedPaths(updateRepairDto.evidencePicture, files.evidencePicture);

    const repair = await this.repairsService.update(id, updateRepairDto);

    if (!repair) {
      throw new NotFoundException(`Repair ${id} not found`);
    }

    return repair;
  }

  @Post('import')
  @UseGuards(EditorGuard)
  @UseInterceptors(FileInterceptor('file'))
  importWorkbook(@UploadedFile() file: { buffer: Buffer } | undefined, @Query('preview') preview: string, @Query('exclusions') exclusions: string, @Req() request: RequestWithAuth) {
    if (!file) throw new NotFoundException('Selecciona un archivo Excel.');
    let parsedExclusions: Record<string, string[]> = {};
    if (exclusions) {
      try { parsedExclusions = JSON.parse(exclusions); } catch { throw new BadRequestException('Las exclusiones de importación no son válidas.'); }
    }
    return this.repairsService.importWorkbook(file.buffer, request.user!.id, preview === 'true', parsedExclusions);
  }

  @Post('import/confirm')
  @UseGuards(EditorGuard)
  confirmImport(@Body() records: CreateRepairDto[], @Req() request: RequestWithAuth) {
    return this.repairsService.confirmImport(records, request.user!.id);
  }

  @Patch(':id/review')
  async setReview(@Param('id') id: string, @Body('review') review: boolean) {
    const repair = await this.repairsService.setReview(id, review);
    if (!repair) throw new NotFoundException(`Repair ${id} not found`);
    return repair;
  }

  @Delete(':id')
  @UseGuards(EditorGuard)
  async remove(@Param('id') id: string) {
    const deleted = await this.repairsService.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Repair ${id} not found`);
    }

    return { deleted: true };
  }
}

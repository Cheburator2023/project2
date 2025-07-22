import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ExportCalculationDto, TransformedExportCalculationDto } from '../dto/request/export-calculation.dto';

@Injectable()
export class ExportValidationPipe implements PipeTransform<ExportCalculationDto, TransformedExportCalculationDto> {
    transform(value: ExportCalculationDto): TransformedExportCalculationDto {
        const transformed: TransformedExportCalculationDto = { ...value };

        if (transformed.selectedIds) {
            transformed.selectedIdsArray = transformed.selectedIds
                .split(',')
                .map(id => id.trim())
                .filter(id => id.length > 0);

            if (transformed.selectedIdsArray.length === 0) {
                throw new BadRequestException('At least one valid ID must be provided in selectedIds');
            }
        }

        if (transformed.createdFrom && isNaN(Date.parse(transformed.createdFrom))) {
            throw new BadRequestException('Invalid createdFrom date format');
        }

        if (transformed.createdTo && isNaN(Date.parse(transformed.createdTo))) {
            throw new BadRequestException('Invalid createdTo date format');
        }

        if (transformed.minFinalCoefficient && isNaN(Number(transformed.minFinalCoefficient))) {
            throw new BadRequestException('minFinalCoefficient must be a number');
        }

        if (transformed.maxFinalCoefficient && isNaN(Number(transformed.maxFinalCoefficient))) {
            throw new BadRequestException('maxFinalCoefficient must be a number');
        }

        return transformed;
    }
}
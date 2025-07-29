import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
} from '@nestjs/common';
import { CustomLogger } from 'src/shared/services/logger.service';

@Injectable()
export class JsonValidationPipe implements PipeTransform {
    constructor(private readonly logger: CustomLogger) {}

    transform(value: any, metadata: ArgumentMetadata) {
        if (metadata.type === 'body') {
            try {
                // Если тело запроса уже объект (парсинг прошел успешно)
                if (typeof value === 'object' && value !== null) {
                    return value;
                }

                // Пытаемся распарсить вручную для выявления точного места ошибки
                JSON.parse(JSON.stringify(value));
            } catch (error) {
                const errorContext = this.getErrorContext(error, value);
                this.logger.error(
                    'Invalid JSON received',
                    error.stack,
                    'JsonValidationPipe',
                    {
                        errorPosition: errorContext,
                        rawInput: this.sanitizeInput(value),
                    },
                );
                throw new BadRequestException('Invalid JSON format');
            }
        }
        return value;
    }

    private getErrorContext(error: Error, input: any): string {
        if (error instanceof SyntaxError) {
            try {
                // Пытаемся найти позицию ошибки
                const match = error.message.match(/at position (\d+)/);
                if (match) {
                    const position = parseInt(match[1], 10);
                    return `Error at position ${position}: "${this.getSurroundingChars(input, position)}"`;
                }
            } catch (e) {
                return 'Unable to determine error position';
            }
        }
        return error.message;
    }

    private getSurroundingChars(str: string, position: number, radius = 20): string {
        const start = Math.max(0, position - radius);
        const end = Math.min(str.length, position + radius);
        return str.substring(start, end);
    }

    private sanitizeInput(input: any): string {
        const str = typeof input === 'string' ? input : JSON.stringify(input);
        return str.length > 500 ? `${str.substring(0, 500)}...` : str;
    }
}
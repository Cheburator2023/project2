import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLogger } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: CustomLogger) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();

        this.logger.log(
            `Incoming request: ${request.method} ${request.url}`,
            'HTTP',
            { body: request.body },
        );

        return next.handle().pipe(
            tap({
                error: (err) => {
                    this.logger.error(
                        `Request failed: ${request.method} ${request.url}`,
                        err.stack,
                        'HTTP',
                        {
                            statusCode: err.getStatus?.(),
                            response: err.getResponse?.(),
                        },
                    );
                },
            }),
        );
    }
}
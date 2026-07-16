import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { CustomLogger } from "../services/logger.service";
import { Request, Response } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	constructor(private readonly logger: CustomLogger) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const httpContext = context.switchToHttp();
		const request = httpContext.getRequest<Request>();
		const response = httpContext.getResponse<Response>();

		const startTime = Date.now();

		const headers = { ...request.headers };
		if (headers.authorization) {
			headers.authorization = "*****";
		}

		return next.handle().pipe(
			tap({
				next: () => {
					const responseTime = (Date.now() - startTime) / 1000;
					this.logger.httpLog(request, response, responseTime);
				},
				error: (err) => {
					const responseTime = (Date.now() - startTime) / 1000;
					this.logger.error(
						`Request failed: ${request.method} ${request.url}`,
						err.stack,
						"HTTP",
						{
							responseStatus: err.getStatus?.(),
							responseBody: err.getResponse?.(),
							requestTime: responseTime,
							headers,
						},
					);
				},
			}),
		);
	}
}

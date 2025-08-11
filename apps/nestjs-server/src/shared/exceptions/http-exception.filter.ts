import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();
		const status = exception.getStatus();

		const errorResponse = exception.getResponse();
		const isProduction = process.env.NODE_ENV === "production";

		const errorDetails = {
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			method: request.method,
			message: exception.message,
			...(typeof errorResponse === "object" && errorResponse !== null
				? errorResponse
				: {}),
		};

		if (!isProduction) {
			errorDetails["stack"] = exception.stack;
			errorDetails["requestBody"] = request.body;
			errorDetails["requestQuery"] = request.query;
			errorDetails["requestParams"] = request.params;
		}

		this.logger.error(`HTTP Exception: ${exception.message}`, {
			...errorDetails,
			stack: exception.stack,
		});

		response.status(status).json(errorDetails);
	}
}

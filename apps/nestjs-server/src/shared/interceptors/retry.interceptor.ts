import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from "@nestjs/common";
import { retryConfig } from "../config/retry.config";
import {
	catchError,
	delayWhen,
	Observable,
	retryWhen,
	scan,
	throwError,
	timer,
} from "rxjs";

@Injectable()
export class RetryInterceptor implements NestInterceptor {
	private readonly logger = new Logger(RetryInterceptor.name);

	intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(
			retryWhen((errors) =>
				errors.pipe(
					scan((count, error) => {
						if (count >= retryConfig.defaultMaxRetries) {
							throw error;
						}

						const status = error?.status || error?.response?.status;
						if (!retryConfig.httpStatusesToRetry.includes(status)) {
							throw error;
						}

						const delayMs = retryConfig.defaultBaseDelayMs * 2 ** count;
						this.logger.warn(
							`Attempt ${count + 1} failed. Retrying in ${delayMs}ms...`,
							error.message,
						);

						return count + 1;
					}, 0),
					delayWhen((count) => {
						const delayMs = retryConfig.defaultBaseDelayMs * 2 ** (count - 1);
						return timer(delayMs);
					}),
				),
			),
			catchError((error) => throwError(() => error)),
		);
	}
}

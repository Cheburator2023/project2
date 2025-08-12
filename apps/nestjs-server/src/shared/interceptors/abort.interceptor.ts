import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";

@Injectable()
export class AbortInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();

		if (!request.context) {
			request.context = {
				requestId: Math.random().toString(36).substring(2, 9),
				abortController: new AbortController(),
			};
		}

		if (!request.context.abortController) {
			request.context.abortController = new AbortController();
		}

		const signal = request.context.abortController.signal;

		return new Observable((subscriber) => {
			const subscription = next.handle().subscribe({
				next: (value) => subscriber.next(value),
				error: (err) => subscriber.error(err),
				complete: () => subscriber.complete(),
			});

			signal.addEventListener("abort", () => {
				subscription.unsubscribe();
				subscriber.complete();
			});

			return () => subscription.unsubscribe();
		});
	}
}

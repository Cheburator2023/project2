import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export interface RequestContext {
	requestId: string;
	abortController: AbortController;
}

export const ReqContext = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): RequestContext => {
		const request = ctx.switchToHttp().getRequest<Request>();

		if (!request.context) {
			request.context = {
				requestId: Math.random().toString(36).substring(2, 9),
				abortController: new AbortController(),
			};
		}

		return request.context as RequestContext;
	},
);

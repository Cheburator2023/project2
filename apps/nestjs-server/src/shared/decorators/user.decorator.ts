import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const currentUserFactory = (
	_data: unknown,
	context: ExecutionContext,
) => {
	const request = context.switchToHttp().getRequest();
	return request.user;
};

export const CurrentUser = createParamDecorator(currentUserFactory);

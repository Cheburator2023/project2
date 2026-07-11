import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { PaginatedResult } from "../../modules/calculation/interfaces/paginated-result.interface";
import { STREAM_FILTER_KEY } from "../decorators/stream-filter.decorator";
import { StreamMappingService } from "../services/stream-mapping.service";

interface User {
	groups: string[];
}

interface StreamFilterable {
	streamExecutor?: string;
}

type ResponseData =
	| StreamFilterable[]
	| PaginatedResult<StreamFilterable>
	| Record<string, unknown>;

/**
 * Фильтрует ответы по стримам для DS/DE/ModelOps и т д ролей.
 * Применяется к методам с декоратором @StreamFilter().
 */
@Injectable()
export class StreamFilterInterceptor implements NestInterceptor {
	constructor(
		private readonly reflector: Reflector,
		private readonly streamMappingService: StreamMappingService,
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const shouldFilter = this.reflector.getAllAndOverride<boolean>(
			STREAM_FILTER_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!shouldFilter) {
			return next.handle();
		}

		const user: User | undefined = context.switchToHttp().getRequest().user;

		return next
			.handle()
			.pipe(
				map((data: unknown) =>
					this.filterResponse(data as ResponseData, user),
				),
			);
	}

	private filterResponse(data: ResponseData, user?: User): ResponseData {
		if (
			!this.isValidUser(user) ||
			!this.streamMappingService.isStreamFilteredUser(user.groups)
		) {
			return data;
		}

		const allowedStreams = this.streamMappingService.getGroupsAfterMapping(
			user.groups,
		);

		if (allowedStreams.length === 0) {
			return this.createEmptyResponse(data);
		}

		return this.applyStreamFilter(data, allowedStreams);
	}

	private isValidUser(user?: User): user is User {
		return Boolean(user?.groups?.length);
	}

	private createEmptyResponse(data: ResponseData): ResponseData {
		if (Array.isArray(data)) {
			return [];
		}

		if (this.isPaginatedResult(data)) {
			return {
				...data,
				data: [],
				meta: { ...data.meta, total: 0 },
			};
		}

		return data;
	}

	private applyStreamFilter(
		data: ResponseData,
		allowedStreams: string[],
	): ResponseData {
		if (Array.isArray(data)) {
			return data.filter((item) => this.hasAllowedStream(item, allowedStreams));
		}

		if (this.isPaginatedResult(data)) {
			const filteredData = data.data.filter((item) =>
				this.hasAllowedStream(item, allowedStreams),
			);

			return {
				...data,
				data: filteredData,
				meta: {
					...data.meta,
					total: filteredData.length,
					lastPage: Math.ceil(filteredData.length / data.meta.limit),
				},
			};
		}

		return data;
	}

	private hasAllowedStream(item: unknown, allowedStreams: string[]): boolean {
		const streamItem = item as StreamFilterable;
		return Boolean(
			streamItem?.streamExecutor &&
				allowedStreams.includes(streamItem.streamExecutor),
		);
	}

	private isPaginatedResult(
		data: ResponseData,
	): data is PaginatedResult<StreamFilterable> {
		return Boolean(
			data &&
				typeof data === "object" &&
				"data" in data &&
				"meta" in data &&
				Array.isArray(data.data),
		);
	}
}

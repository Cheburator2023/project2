import { lastValueFrom, of } from "rxjs";
import { Reflector } from "@nestjs/core";
import { StreamFilterInterceptor } from "../../../../src/shared/interceptors/stream-filter.interceptor";
import { StreamMappingService } from "../../../../src/shared/services/stream-mapping.service";

describe("StreamFilterInterceptor", () => {
	const buildSetup = (
		shouldFilter: boolean,
		opts: Partial<{
			isFiltered: boolean;
			allowed: string[];
			user: any;
		}> = {},
	) => {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue(shouldFilter),
		} as unknown as Reflector;
		const streamSvc = {
			isStreamFilteredUser: jest.fn().mockReturnValue(opts.isFiltered ?? true),
			getGroupsAfterMapping: jest.fn().mockReturnValue(opts.allowed ?? []),
		} as unknown as StreamMappingService;

		const ctx = {
			getHandler: () => null,
			getClass: () => null,
			switchToHttp: () => ({
				getRequest: () => ({ user: opts.user }),
			}),
		} as any;

		return {
			interceptor: new StreamFilterInterceptor(reflector, streamSvc),
			ctx,
		};
	};

	it("passes through when shouldFilter=false", async () => {
		const { interceptor, ctx } = buildSetup(false);
		const next: any = { handle: () => of("anything") };
		expect(await lastValueFrom(interceptor.intercept(ctx, next))).toBe(
			"anything",
		);
	});

	it("returns data unchanged when user invalid (no groups)", async () => {
		const { interceptor, ctx } = buildSetup(true, { user: undefined });
		const data = [{ streamExecutor: "S1" }];
		const next: any = { handle: () => of(data) };
		expect(await lastValueFrom(interceptor.intercept(ctx, next))).toBe(data);
	});

	it("returns data unchanged when user not stream-filtered", async () => {
		const { interceptor, ctx } = buildSetup(true, {
			user: { groups: ["g"] },
			isFiltered: false,
		});
		const data = [{ streamExecutor: "S1" }];
		const next: any = { handle: () => of(data) };
		expect(await lastValueFrom(interceptor.intercept(ctx, next))).toBe(data);
	});

	it("returns empty array when allowedStreams is empty (array data)", async () => {
		const { interceptor, ctx } = buildSetup(true, {
			user: { groups: ["g"] },
			isFiltered: true,
			allowed: [],
		});
		const next: any = { handle: () => of([{ streamExecutor: "S1" }]) };
		expect(await lastValueFrom(interceptor.intercept(ctx, next))).toEqual([]);
	});

	it("returns empty paginated when allowedStreams is empty (paginated data)", async () => {
		const { interceptor, ctx } = buildSetup(true, {
			user: { groups: ["g"] },
			isFiltered: true,
			allowed: [],
		});
		const data = {
			data: [{ streamExecutor: "S1" }],
			meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
		};
		const next: any = { handle: () => of(data) };
		const result: any = await lastValueFrom(interceptor.intercept(ctx, next));
		expect(result.data).toEqual([]);
		expect(result.meta.total).toBe(0);
	});

	it("filters array by allowed streams", async () => {
		const { interceptor, ctx } = buildSetup(true, {
			user: { groups: ["g"] },
			isFiltered: true,
			allowed: ["S1"],
		});
		const next: any = {
			handle: () => of([{ streamExecutor: "S1" }, { streamExecutor: "S2" }]),
		};
		const result: any = await lastValueFrom(interceptor.intercept(ctx, next));
		expect(result).toEqual([{ streamExecutor: "S1" }]);
	});

	it("filters paginated by allowed streams", async () => {
		const { interceptor, ctx } = buildSetup(true, {
			user: { groups: ["g"] },
			isFiltered: true,
			allowed: ["S1"],
		});
		const data = {
			data: [{ streamExecutor: "S1" }, { streamExecutor: "S2" }],
			meta: { total: 2, page: 1, limit: 10, lastPage: 1 },
		};
		const next: any = { handle: () => of(data) };
		const result: any = await lastValueFrom(interceptor.intercept(ctx, next));
		expect(result.data).toHaveLength(1);
		expect(result.meta.total).toBe(1);
	});

	it("returns plain object data unchanged for non-array, non-paginated payloads", async () => {
		const { interceptor, ctx } = buildSetup(true, {
			user: { groups: ["g"] },
			isFiltered: true,
			allowed: ["S1"],
		});
		const obj = { foo: "bar" };
		const next: any = { handle: () => of(obj) };
		expect(await lastValueFrom(interceptor.intercept(ctx, next))).toBe(obj);
	});
});

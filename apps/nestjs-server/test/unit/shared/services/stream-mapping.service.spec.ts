import { StreamMappingService } from "../../../../src/shared/services/stream-mapping.service";
import {
	DEPARTMENTS,
	STREAMS,
	STREAM_FILTERED_ROLES,
} from "../../../../src/shared/constants";

describe("StreamMappingService", () => {
	let service: StreamMappingService;

	beforeEach(() => {
		service = new StreamMappingService();
	});

	describe("isStreamFilteredUser", () => {
		it("returns false for non-array inputs", () => {
			expect(service.isStreamFilteredUser(null as any)).toBe(false);
		});

		it("returns false when user has no filtered roles", () => {
			expect(service.isStreamFilteredUser(["unknown-role"])).toBe(false);
		});

		it("returns true when user has at least one filtered role", () => {
			expect(service.isStreamFilteredUser([STREAM_FILTERED_ROLES[0]])).toBe(
				true,
			);
		});
	});

	describe("getGroupsAfterMapping", () => {
		it("returns [] for non-array input", () => {
			expect(service.getGroupsAfterMapping(undefined as any)).toEqual([]);
		});

		it("returns [] for empty array", () => {
			expect(service.getGroupsAfterMapping([])).toEqual([]);
		});

		it("returns [] for non-filtered user", () => {
			expect(
				service.getGroupsAfterMapping([Object.values(DEPARTMENTS)[0]]),
			).toEqual([]);
		});

		it("maps department to streams when filtered user", () => {
			const role = STREAM_FILTERED_ROLES[0];
			const dept = DEPARTMENTS.RB;
			const result = service.getGroupsAfterMapping([role, dept]);
			expect(result).toContain(STREAMS.RB);
		});

		it("passes through known stream", () => {
			const role = STREAM_FILTERED_ROLES[0];
			const stream = STREAMS.RB;
			const result = service.getGroupsAfterMapping([role, stream]);
			expect(result).toContain(stream);
		});
	});
});

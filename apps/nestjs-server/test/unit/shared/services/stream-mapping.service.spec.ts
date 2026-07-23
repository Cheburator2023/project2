import { StreamMappingService } from "../../../../src/shared/services/stream-mapping.service";
import {
	DEPARTMENTS,
	STREAMS,
	STREAM_FILTERED_ROLES,
} from "../../../../src/shared/constants";
import {
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_LABELS,
} from "@smart-anketa/api-contract";

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

		it("returns false for lead even if nested path also yields ds/de/modelops", () => {
			expect(service.isStreamFilteredUser(["/ds/ds_lead"])).toBe(false);
			expect(service.isStreamFilteredUser(["ds", "ds_lead"])).toBe(false);
			expect(service.isStreamFilteredUser(["/de/de_lead"])).toBe(false);
			expect(service.isStreamFilteredUser(["/modelops/modelops_lead"])).toBe(
				false,
			);
		});

		it("filters da (Аналитик качества модельных данных) by stream", () => {
			expect(service.isStreamFilteredUser(["/da"])).toBe(true);
			expect(service.isStreamFilteredUser(["da"])).toBe(true);
		});

		it("does not filter mntranlst / mipm / saprg / sacfg (see all list)", () => {
			expect(service.isStreamFilteredUser(["/mntranlst"])).toBe(false);
			expect(service.isStreamFilteredUser(["/mipm"])).toBe(false);
			expect(service.isStreamFilteredUser(["/saprg"])).toBe(false);
			expect(service.isStreamFilteredUser(["/sacfg"])).toBe(false);
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
			expect(result).toContain(V2_IMPLEMENTATION_STREAM.RB);
			expect(result).toContain(
				V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.RB],
			);
		});

		it("passes through known stream", () => {
			const role = STREAM_FILTERED_ROLES[0];
			const stream = STREAMS.RB;
			const result = service.getGroupsAfterMapping([role, stream]);
			expect(result).toContain(stream);
		});

		it("expands v2 implementation stream code to label and back", () => {
			const role = STREAM_FILTERED_ROLES[0];
			const result = service.getGroupsAfterMapping([
				role,
				V2_IMPLEMENTATION_STREAM.RB,
			]);
			expect(result).toEqual(
				expect.arrayContaining([
					V2_IMPLEMENTATION_STREAM.RB,
					V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.RB],
				]),
			);
		});

		it("maps platform stream codes from groups directly", () => {
			const role = STREAM_FILTERED_ROLES[0];
			const result = service.getGroupsAfterMapping([
				role,
				V2_IMPLEMENTATION_STREAM.DADM,
				V2_IMPLEMENTATION_STREAM.PIRM,
				V2_IMPLEMENTATION_STREAM.IDSRC,
				V2_IMPLEMENTATION_STREAM.MDLCTL,
				V2_IMPLEMENTATION_STREAM.STRDAT,
				V2_IMPLEMENTATION_STREAM.DIGAGT,
			]);
			expect(result).toEqual(
				expect.arrayContaining([
					V2_IMPLEMENTATION_STREAM.DADM,
					V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.DADM],
					V2_IMPLEMENTATION_STREAM.PIRM,
					V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.PIRM],
					V2_IMPLEMENTATION_STREAM.IDSRC,
					V2_IMPLEMENTATION_STREAM.MDLCTL,
					V2_IMPLEMENTATION_STREAM.STRDAT,
					V2_IMPLEMENTATION_STREAM.DIGAGT,
				]),
			);
		});
	});
});

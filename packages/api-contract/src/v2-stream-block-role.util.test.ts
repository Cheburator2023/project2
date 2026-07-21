import { describe, expect, it } from "vitest";
import {
	V2_STREAM_BLOCK_ROLE,
	V2_STREAM_BLOCK_ROLE_CODES,
	V2_STREAM_BLOCK_ROLE_LABELS,
	normalizeStreamBlockRoles,
	resolveStreamBlockRolesLabel,
	serializeStreamBlockRoles,
} from "./v2-stream-block-role.util";

describe("v2-stream-block-role.util", () => {
	it("normalizes role codes and labels", () => {
		expect(normalizeStreamBlockRoles(V2_STREAM_BLOCK_ROLE.SAPRG)).toEqual([
			V2_STREAM_BLOCK_ROLE.SAPRG,
		]);
		expect(normalizeStreamBlockRoles(V2_STREAM_BLOCK_ROLE.DS)).toEqual([
			V2_STREAM_BLOCK_ROLE.DS,
		]);
		expect(
			normalizeStreamBlockRoles(
				V2_STREAM_BLOCK_ROLE_LABELS[V2_STREAM_BLOCK_ROLE.SACFG],
			),
		).toEqual([V2_STREAM_BLOCK_ROLE.SACFG]);
	});

	it("includes all Role codes", () => {
		expect(V2_STREAM_BLOCK_ROLE_CODES).toEqual(
			expect.arrayContaining([
				V2_STREAM_BLOCK_ROLE.ADMIN_IT,
				V2_STREAM_BLOCK_ROLE.DS,
				V2_STREAM_BLOCK_ROLE.MIPM,
				V2_STREAM_BLOCK_ROLE.SAREP,
			]),
		);
		expect(V2_STREAM_BLOCK_ROLE_CODES).toHaveLength(16);
	});

	it("serializes single and multiple roles", () => {
		expect(serializeStreamBlockRoles([V2_STREAM_BLOCK_ROLE.SAPRG])).toBe(
			V2_STREAM_BLOCK_ROLE.SAPRG,
		);
		expect(
			serializeStreamBlockRoles([
				V2_STREAM_BLOCK_ROLE.SAPRG,
				V2_STREAM_BLOCK_ROLE.SAREP,
			]),
		).toEqual([V2_STREAM_BLOCK_ROLE.SAPRG, V2_STREAM_BLOCK_ROLE.SAREP]);
	});

	it("resolves labels for ui display", () => {
		expect(
			resolveStreamBlockRolesLabel([
				V2_STREAM_BLOCK_ROLE.SAPRG,
				V2_STREAM_BLOCK_ROLE.SACFG,
			]),
		).toBe(
			`${V2_STREAM_BLOCK_ROLE_LABELS[V2_STREAM_BLOCK_ROLE.SAPRG]}, ${V2_STREAM_BLOCK_ROLE_LABELS[V2_STREAM_BLOCK_ROLE.SACFG]}`,
		);
	});
});

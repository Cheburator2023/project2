"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_stream_block_role_util_1 = require("./v2-stream-block-role.util");
(0, vitest_1.describe)("v2-stream-block-role.util", () => {
    (0, vitest_1.it)("normalizes role codes and labels", () => {
        (0, vitest_1.expect)((0, v2_stream_block_role_util_1.normalizeStreamBlockRoles)(v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAPRG)).toEqual([
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAPRG,
        ]);
        (0, vitest_1.expect)((0, v2_stream_block_role_util_1.normalizeStreamBlockRoles)(v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.DS)).toEqual([
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.DS,
        ]);
        (0, vitest_1.expect)((0, v2_stream_block_role_util_1.normalizeStreamBlockRoles)(v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE_LABELS[v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SACFG])).toEqual([v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SACFG]);
    });
    (0, vitest_1.it)("includes all Role codes", () => {
        (0, vitest_1.expect)(v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE_CODES).toEqual(vitest_1.expect.arrayContaining([
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.ADMIN_IT,
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.DS,
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.MIPM,
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAREP,
        ]));
        (0, vitest_1.expect)(v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE_CODES).toHaveLength(16);
    });
    (0, vitest_1.it)("serializes single and multiple roles", () => {
        (0, vitest_1.expect)((0, v2_stream_block_role_util_1.serializeStreamBlockRoles)([v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAPRG])).toBe(v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAPRG);
        (0, vitest_1.expect)((0, v2_stream_block_role_util_1.serializeStreamBlockRoles)([
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAPRG,
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAREP,
        ])).toEqual([v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAPRG, v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAREP]);
    });
    (0, vitest_1.it)("resolves labels for ui display", () => {
        (0, vitest_1.expect)((0, v2_stream_block_role_util_1.resolveStreamBlockRolesLabel)([
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAPRG,
            v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SACFG,
        ])).toBe(`${v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE_LABELS[v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SAPRG]}, ${v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE_LABELS[v2_stream_block_role_util_1.V2_STREAM_BLOCK_ROLE.SACFG]}`);
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_user_stream_mapping_util_1 = require("./v2-user-stream-mapping.util");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
(0, vitest_1.describe)("v2-user-stream-mapping", () => {
    (0, vitest_1.it)("maps _rnd / rnd to RnD + AI-модели партнерств", () => {
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.resolveV2UserScopedStreamsFromGroups)(["sum_ds_rnd"])).toEqual(vitest_1.expect.arrayContaining([
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
        ]));
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.resolveV2UserScopedStreamsFromGroups)(["rnd"])).toEqual(vitest_1.expect.arrayContaining([
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
        ]));
        const allowed = (0, v2_user_stream_mapping_util_1.resolveV2UserAllowedStreamFilterValues)(["ds", "sum_ds_rnd"], { deModelopsViewAllStreams: false });
        (0, vitest_1.expect)(allowed).toEqual(vitest_1.expect.arrayContaining([
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND],
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC],
        ]));
    });
    (0, vitest_1.it)("does not expand ptitpc to rnd", () => {
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.resolveV2UserScopedStreamsFromGroups)(["sum_ds_ptitpc"])).toEqual([
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
        ]);
    });
    (0, vitest_1.it)("de/modelops view all streams by default", () => {
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["de", "sum_de_rb"])).toBe(false);
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["modelops", "sum_mo_rnd"])).toBe(false);
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["de_lead"])).toBe(false);
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["modelops_lead"])).toBe(false);
    });
    (0, vitest_1.it)("de/modelops are filtered when deModelopsViewAllStreams=false", () => {
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["de", "sum_de_rb"], {
            deModelopsViewAllStreams: false,
        })).toBe(true);
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["modelops", "sum_mo_rb"], {
            deModelopsViewAllStreams: false,
        })).toBe(true);
        /** leads remain exempt */
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["de_lead"], {
            deModelopsViewAllStreams: false,
        })).toBe(false);
    });
    (0, vitest_1.it)("ds stays stream-filtered even when deModelopsViewAll is on", () => {
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["ds", "sum_ds_rb"])).toBe(true);
    });
    (0, vitest_1.it)("stream_view_all bypasses filter for any role", () => {
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["ds", "sum_ds_rb", v2_user_stream_mapping_util_1.V2_USER_STREAM_VIEW_ALL_ROLE_CODE], { deModelopsViewAllStreams: false })).toBe(false);
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["/stream_view_all", "ds"], {
            deModelopsViewAllStreams: false,
        })).toBe(false);
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.isV2UserStreamFilteredByGroups)(["sum_stream_view_all", "ds"], {
            deModelopsViewAllStreams: false,
        })).toBe(false);
    });
    (0, vitest_1.it)("filter keeps rnd+ptitpc questionnaires for ds_rnd", () => {
        const items = [
            {
                id: "1",
                formData: {
                    generalInfo: {
                        implementationStream: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
                    },
                },
            },
            {
                id: "2",
                formData: {
                    generalInfo: {
                        implementationStream: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
                    },
                },
            },
            {
                id: "3",
                formData: {
                    generalInfo: {
                        implementationStream: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB,
                    },
                },
            },
        ];
        const filtered = (0, v2_user_stream_mapping_util_1.filterV2QuestionnairesByUserStreamGroups)(items, ["ds", "sum_ds_rnd"], true, { deModelopsViewAllStreams: false });
        (0, vitest_1.expect)(filtered.map((x) => x.id)).toEqual(["1", "2"]);
    });
});

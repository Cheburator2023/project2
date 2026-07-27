import { describe, expect, it } from "vitest";
import { filterV2QuestionnairesByUserStreamGroups, isV2UserStreamFilteredByGroups, resolveV2UserAllowedStreamFilterValues, resolveV2UserScopedStreamsFromGroups, V2_USER_STREAM_VIEW_ALL_ROLE_CODE, } from "./v2-user-stream-mapping.util";
import { V2_IMPLEMENTATION_STREAM, V2_IMPLEMENTATION_STREAM_LABELS, } from "./v2-implementation-streams.util";
describe("v2-user-stream-mapping", () => {
    it("maps _rnd / rnd to RnD + AI-модели партнерств", () => {
        expect(resolveV2UserScopedStreamsFromGroups(["sum_ds_rnd"])).toEqual(expect.arrayContaining([
            V2_IMPLEMENTATION_STREAM.RND,
            V2_IMPLEMENTATION_STREAM.PTITPC,
        ]));
        expect(resolveV2UserScopedStreamsFromGroups(["rnd"])).toEqual(expect.arrayContaining([
            V2_IMPLEMENTATION_STREAM.RND,
            V2_IMPLEMENTATION_STREAM.PTITPC,
        ]));
        const allowed = resolveV2UserAllowedStreamFilterValues(["ds", "sum_ds_rnd"], { deModelopsViewAllStreams: false });
        expect(allowed).toEqual(expect.arrayContaining([
            V2_IMPLEMENTATION_STREAM.RND,
            V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.RND],
            V2_IMPLEMENTATION_STREAM.PTITPC,
            V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.PTITPC],
        ]));
    });
    it("does not expand ptitpc to rnd", () => {
        expect(resolveV2UserScopedStreamsFromGroups(["sum_ds_ptitpc"])).toEqual([
            V2_IMPLEMENTATION_STREAM.PTITPC,
        ]);
    });
    it("de/modelops view all streams by default", () => {
        expect(isV2UserStreamFilteredByGroups(["de", "sum_de_rb"])).toBe(false);
        expect(isV2UserStreamFilteredByGroups(["modelops", "sum_mo_rnd"])).toBe(false);
        expect(isV2UserStreamFilteredByGroups(["de_lead"])).toBe(false);
        expect(isV2UserStreamFilteredByGroups(["modelops_lead"])).toBe(false);
    });
    it("de/modelops are filtered when deModelopsViewAllStreams=false", () => {
        expect(isV2UserStreamFilteredByGroups(["de", "sum_de_rb"], {
            deModelopsViewAllStreams: false,
        })).toBe(true);
        expect(isV2UserStreamFilteredByGroups(["modelops", "sum_mo_rb"], {
            deModelopsViewAllStreams: false,
        })).toBe(true);
        /** leads remain exempt */
        expect(isV2UserStreamFilteredByGroups(["de_lead"], {
            deModelopsViewAllStreams: false,
        })).toBe(false);
    });
    it("ds stays stream-filtered even when deModelopsViewAll is on", () => {
        expect(isV2UserStreamFilteredByGroups(["ds", "sum_ds_rb"])).toBe(true);
    });
    it("stream_view_all bypasses filter for any role", () => {
        expect(isV2UserStreamFilteredByGroups(["ds", "sum_ds_rb", V2_USER_STREAM_VIEW_ALL_ROLE_CODE], { deModelopsViewAllStreams: false })).toBe(false);
        expect(isV2UserStreamFilteredByGroups(["/stream_view_all", "ds"], {
            deModelopsViewAllStreams: false,
        })).toBe(false);
        expect(isV2UserStreamFilteredByGroups(["sum_stream_view_all", "ds"], {
            deModelopsViewAllStreams: false,
        })).toBe(false);
    });
    it("filter keeps rnd+ptitpc questionnaires for ds_rnd", () => {
        const items = [
            {
                id: "1",
                formData: {
                    generalInfo: {
                        implementationStream: V2_IMPLEMENTATION_STREAM.RND,
                    },
                },
            },
            {
                id: "2",
                formData: {
                    generalInfo: {
                        implementationStream: V2_IMPLEMENTATION_STREAM.PTITPC,
                    },
                },
            },
            {
                id: "3",
                formData: {
                    generalInfo: {
                        implementationStream: V2_IMPLEMENTATION_STREAM.RB,
                    },
                },
            },
        ];
        const filtered = filterV2QuestionnairesByUserStreamGroups(items, ["ds", "sum_ds_rnd"], true, { deModelopsViewAllStreams: false });
        expect(filtered.map((x) => x.id)).toEqual(["1", "2"]);
    });
});

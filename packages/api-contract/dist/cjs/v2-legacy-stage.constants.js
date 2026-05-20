"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_LEGACY_STAGE_SUMMARY_POINTERS = exports.V2_LEGACY_STAGE_SUMMARY_FIELD_KEYS = void 0;
/**
 * Поля `summary`, которые POST /calculate перезаписывает движком этапов v1
 * (`v2-legacy-stage-evaluation.ts`), после правил JsonLogic.
 *
 * Не переносятся в конструктор JsonLogic — правятся в TypeScript на бекенде.
 */
exports.V2_LEGACY_STAGE_SUMMARY_FIELD_KEYS = [
    "baseScoreStream",
    "scoreWithComplexityCoeff",
    "deviationFromBaseline",
    "detailedCalculation",
    "platformStreams",
];
exports.V2_LEGACY_STAGE_SUMMARY_POINTERS = [
    "/summary/baseScoreStream",
    "/summary/scoreWithComplexityCoeff",
    "/summary/deviationFromBaseline",
    "/summary/detailedCalculation",
    "/summary/platformStreams",
];

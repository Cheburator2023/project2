"use strict";
/**
 * SA_LOGIC v4: terms-формула и расширенные enum-ы (операторы/статусы — в v2-typical-work.types).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_WORK_FORMULA_TERM_KIND_VALUES = exports.V2_LABOR_PARAM_KIND_VALUES = exports.V2_WORK_TRIGGER_STATUS_V4_VALUES = exports.V2_WORK_RULE_OPERATOR_V4_VALUES = void 0;
exports.V2_WORK_RULE_OPERATOR_V4_VALUES = [
    "=",
    "!=",
    ">=",
    "<=",
    ">",
    "<",
    "in",
    "not_in",
];
exports.V2_WORK_TRIGGER_STATUS_V4_VALUES = [
    "appears",
    "hidden",
    "no_triggers",
    "invalid",
];
exports.V2_LABOR_PARAM_KIND_VALUES = ["by_value", "any_of"];
exports.V2_WORK_FORMULA_TERM_KIND_VALUES = [
    "base_norm",
    "multiplier",
    "additive",
    "transitive",
];

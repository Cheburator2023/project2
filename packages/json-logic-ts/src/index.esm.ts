import { bindEngine, getEngine } from "./engine";
import { jsonLogic } from "./loadEngine.esm";

bindEngine(jsonLogic);

export * from "./engine";
export { isJsonLogicTruthy, toFiniteNumberOrNull } from "./truthy";
export type { JsonLogicData, JsonLogicEngine, JsonLogicRule } from "./types";

export default getEngine();

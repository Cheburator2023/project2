import { createRequire } from "node:module";
import type { JsonLogicEngine } from "./types";

const requireLogic = createRequire(__filename);

export const jsonLogic = requireLogic("./logic.js") as JsonLogicEngine;

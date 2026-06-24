import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const target = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../dist/esm/logic.js",
);

let source = readFileSync(target, "utf8");

source = source.replace(
	/}\(this, function\(\) \{/,
	"}(globalThis, function() {",
);

source = source.replace(
	/;\(function\(root, factory\) \{\s*if \(typeof define === "function" && define\.amd\) \{\s*define\(factory\);\s*\} else if \(typeof exports === "object"\) \{\s*module\.exports = factory\(\);\s*\} else \{\s*root\.jsonLogic = factory\(\);\s*\}\s*\}\(globalThis, function\(\) \{/,
	`;(function(root, factory) {
  var engine = factory();
  root.jsonLogic = engine;
  if (typeof define === "function" && define.amd) {
    define(function() { return engine; });
  } else if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = engine;
  }
}(globalThis, function() {`,
);

writeFileSync(target, source);

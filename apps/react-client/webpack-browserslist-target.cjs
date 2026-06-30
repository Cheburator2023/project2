/**
 * CJS-обёртка для webpack: browserslist-to-esbuild v2 — ESM-only, require() в .js не работает.
 * Логика совместима с https://github.com/marcofugaro/browserslist-to-esbuild
 */
const path = require("node:path");
const browserslist = require("browserslist");

const SUPPORTED_ESBUILD_TARGETS = [
	"es",
	"chrome",
	"edge",
	"firefox",
	"ios",
	"node",
	"safari",
	"opera",
	"ie",
];

const UNSUPPORTED = ["android 4"];

const REPLACES = {
	ios_saf: "ios",
	android: "chrome",
};

function browserslistToEsbuild(browserslistConfig, options = {}) {
	let config = browserslistConfig;
	if (!config) {
		const configPath = options.path ?? path.resolve(__dirname, "../..");
		config = browserslist.loadConfig({ path: configPath, ...options });
	}

	return browserslist(config, options)
		.filter((entry) => !UNSUPPORTED.some((u) => entry.startsWith(u)))
		.map((entry) => {
			if (entry === "safari TP") {
				return browserslist("last 1 safari version")[0];
			}
			return entry;
		})
		.map((entry) => entry.split(" "))
		.map((parts) => {
			if (REPLACES[parts[0]]) {
				parts[0] = REPLACES[parts[0]];
			}
			return parts;
		})
		.map((parts) => {
			if (parts[1]?.includes("-")) {
				parts[1] = parts[1].slice(0, parts[1].indexOf("-"));
			}
			return parts;
		})
		.map((parts) => {
			if (parts[1]?.endsWith(".0")) {
				parts[1] = parts[1].slice(0, -2);
			}
			return parts;
		})
		.filter((parts) => /^\d+(\.\d+)*$/.test(parts[1] ?? ""))
		.filter((parts) => SUPPORTED_ESBUILD_TARGETS.includes(parts[0]))
		.reduce((acc, parts) => {
			const existingIndex = acc.findIndex((row) => row[0] === parts[0]);
			if (existingIndex !== -1) {
				acc[existingIndex][1] = parts[1];
			} else {
				acc.push(parts);
			}
			return acc;
		}, [])
		.map((parts) => parts.join(""));
}

module.exports = browserslistToEsbuild;

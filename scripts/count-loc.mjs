#!/usr/bin/env node
/**
 * Counts lines of source code under apps/ and packages/.
 *
 *   node ./scripts/count-loc.mjs
 *   npm run count:loc
 *   npm run count:loc -- --depth 5
 *   npm run count:loc -- --depth 4 --min-lines 200
 *   npm run count:loc -- --no-ext
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["apps", "packages"];

const args = process.argv.slice(2);
function argValue(name, fallback) {
	const idx = args.indexOf(name);
	if (idx === -1) return fallback;
	const next = args[idx + 1];
	if (!next || next.startsWith("--")) return fallback;
	return next;
}
const DEPTH = Number.parseInt(argValue("--depth", "4"), 10);
const MIN_LINES = Number.parseInt(argValue("--min-lines", "1"), 10);
const SHOW_EXT = !args.includes("--no-ext");
const MAX_DEPTH = Number.isFinite(DEPTH) && DEPTH > 0 ? DEPTH : 4;
const MIN = Number.isFinite(MIN_LINES) && MIN_LINES > 0 ? MIN_LINES : 1;

const SKIP_DIRS = new Set([
	"node_modules",
	"dist",
	"build",
	"coverage",
	".turbo",
	".cache",
	"vite-app",
	".git",
	"storybook-static",
	"out",
	"tmp",
	"temp",
	"__snapshots__",
]);

/** Extensions treated as written source (not lockfiles / binary assets). */
const CODE_EXTS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".css",
	".scss",
	".less",
	".html",
	".vue",
	".svelte",
	".sql",
	".graphql",
	".gql",
	".md",
	".mdx",
	".json",
	".yml",
	".yaml",
	".toml",
	".sh",
]);

const SKIP_FILES = new Set([
	"package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"composer.lock",
]);

/** Huge generated / factory dumps — still countable, but listed separately. */
const BULK_NAME_RE =
	/\.(snapshot|registry)\.json$|package-lock\.json$|\.min\.(js|css)$/i;

const KIND_ORDER = [
	"prod",
	"test",
	"story",
	"mock",
	"docs",
	"script",
	"config",
	"styles",
	"bulk",
	"other",
];

const KIND_LABEL = {
	prod: "prod (app/lib source)",
	test: "test",
	story: "story / storybook",
	mock: "mock / fixture",
	docs: "docs",
	script: "scripts",
	config: "config",
	styles: "styles (css/scss)",
	bulk: "bulk / generated",
	other: "other",
};

function shouldSkipDir(name) {
	return SKIP_DIRS.has(name) || name.startsWith(".");
}

function walk(dir, files = []) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return files;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (shouldSkipDir(entry.name)) continue;
			walk(full, files);
			continue;
		}
		if (!entry.isFile()) continue;
		if (SKIP_FILES.has(entry.name)) continue;
		const ext = extname(entry.name).toLowerCase();
		if (!CODE_EXTS.has(ext)) continue;
		files.push(full);
	}
	return files;
}

function countLines(filePath) {
	const text = readFileSync(filePath, "utf8");
	if (!text) return 0;
	let n = 0;
	for (let i = 0; i < text.length; i += 1) {
		if (text.charCodeAt(i) === 10) n += 1;
	}
	if (text.charCodeAt(text.length - 1) !== 10) n += 1;
	return n;
}

function toPosix(relPath) {
	return relPath.split(/[/\\]/).join("/");
}

function folderBuckets(relPosix, maxDepth) {
	const parts = relPosix.split("/");
	const dirParts = parts.slice(0, -1);
	const buckets = [];
	const limit = Math.min(dirParts.length, maxDepth);
	for (let i = 1; i <= limit; i += 1) {
		buckets.push(dirParts.slice(0, i).join("/"));
	}
	if (dirParts.length === 0) buckets.push("(root)");
	return buckets;
}

/**
 * Classify file into a reporting kind (first match wins).
 * @returns {"prod"|"test"|"story"|"mock"|"docs"|"script"|"config"|"styles"|"bulk"|"other"}
 */
function classifyKind(relPosix) {
	const lower = relPosix.toLowerCase();
	const parts = lower.split("/");
	const file = basename(lower);
	const ext = extname(file);

	if (BULK_NAME_RE.test(file) || BULK_NAME_RE.test(relPosix)) return "bulk";

	if (
		parts.includes("docs") ||
		parts.includes("doc") ||
		ext === ".md" ||
		ext === ".mdx"
	) {
		return "docs";
	}

	if (
		parts.includes("__mocks__") ||
		parts.includes("mocks") ||
		parts.includes("fixtures") ||
		parts.includes("__fixtures__") ||
		/\.mock\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file) ||
		/\.fixture\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)
	) {
		return "mock";
	}

	if (
		parts.includes("stories") ||
		parts.includes("__stories__") ||
		/\.stories\.(ts|tsx|js|jsx|mdx)$/.test(file) ||
		/\.story\.(ts|tsx|js|jsx)$/.test(file)
	) {
		return "story";
	}

	if (
		parts.includes("test") ||
		parts.includes("tests") ||
		parts.includes("__tests__") ||
		parts.includes("e2e") ||
		parts.includes("spec") ||
		parts.includes("__test__") ||
		/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file) ||
		/\.e2e-spec\.(ts|js)$/.test(file)
	) {
		return "test";
	}

	if (
		parts.includes("scripts") ||
		parts.includes("script") ||
		parts.includes("codemods") ||
		/\.(sh)$/.test(file)
	) {
		return "script";
	}

	if (
		/\.(config|rc)\.(ts|js|mjs|cjs|json)$/.test(file) ||
		/^(tsconfig|jsconfig|eslint|prettier|biome|vitest|jest|webpack|vite|rollup|babel)[\w.-]*\.(json|ts|js|mjs|cjs|yml|yaml)$/.test(
			file,
		) ||
		file === "package.json" ||
		file === "turbo.json" ||
		file === "nx.json" ||
		file === "components.json" ||
		ext === ".yml" ||
		ext === ".yaml" ||
		ext === ".toml"
	) {
		return "config";
	}

	if (ext === ".css" || ext === ".scss" || ext === ".less") return "styles";

	if (
		[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"].includes(
			ext,
		)
	) {
		return "prod";
	}

	return "other";
}

function formatInt(n) {
	return n.toLocaleString("en-US");
}

function bump(map, key, lines) {
	const entry = map.get(key) ?? { lines: 0, files: 0 };
	entry.lines += lines;
	entry.files += 1;
	map.set(key, entry);
}

function printTable(title, rows, keyLabel) {
	if (rows.length === 0) return;
	const keyWidth = Math.max(
		keyLabel.length,
		...rows.map(([k]) => String(k).length),
	);
	const numWidth = Math.max(5, ...rows.map(([, n]) => formatInt(n).length));
	console.log(`\n${title}`);
	console.log(
		`${keyLabel.padEnd(keyWidth)}  ${"lines".padStart(numWidth)}  files`,
	);
	console.log("-".repeat(keyWidth + numWidth + 10));
	for (const [key, lines, files] of rows) {
		console.log(
			`${String(key).padEnd(keyWidth)}  ${formatInt(lines).padStart(numWidth)}  ${formatInt(files).padStart(5)}`,
		);
	}
}

function printFolderTree(title, byFolder, maxDepth, minLines) {
	const entries = [...byFolder.entries()]
		.map(([path, v]) => ({
			path,
			depth: path === "(root)" ? 0 : path.split("/").length,
			...v,
		}))
		.filter((e) => e.depth <= maxDepth && e.lines >= minLines)
		.sort((a, b) => a.path.localeCompare(b.path));

	if (entries.length === 0) return;

	const keyWidth = Math.max(
		8,
		...entries.map((e) => {
			const indent = "  ".repeat(Math.max(0, e.depth - 1));
			const label =
				e.path === "(root)"
					? "(root)"
					: (e.path.split("/").at(-1) ?? e.path);
			return (indent + label).length;
		}),
	);
	const numWidth = Math.max(5, ...entries.map((e) => formatInt(e.lines).length));

	console.log(`\n${title} (depth ≤ ${maxDepth}, min ${minLines} lines)`);
	console.log(
		`${"folder".padEnd(keyWidth)}  ${"lines".padStart(numWidth)}  files  % of parent`,
	);
	console.log("-".repeat(keyWidth + numWidth + 22));

	const byPath = new Map(entries.map((e) => [e.path, e]));

	for (const entry of entries) {
		const depth = entry.depth;
		const indent = "  ".repeat(Math.max(0, depth - 1));
		const label =
			entry.path === "(root)"
				? "(root)"
				: (entry.path.split("/").at(-1) ?? entry.path);
		const display = `${indent}${label}`;

		let pct = "";
		if (depth > 1) {
			const parentPath = entry.path.split("/").slice(0, -1).join("/");
			const parent = byPath.get(parentPath);
			if (parent && parent.lines > 0) {
				pct = `${((100 * entry.lines) / parent.lines).toFixed(1)}%`;
			}
		}

		console.log(
			`${display.padEnd(keyWidth)}  ${formatInt(entry.lines).padStart(numWidth)}  ${formatInt(entry.files).padStart(5)}  ${pct.padStart(9)}`,
		);
	}
}

const byFolder = new Map();
const byFolderProd = new Map();
const byFolderTest = new Map();
const byPackage = new Map();
const byPackageKind = new Map(); // `${pkg}\t${kind}`
const byExt = new Map();
const byKind = new Map();

let totalLines = 0;
let totalFiles = 0;

for (const target of TARGETS) {
	const abs = join(root, target);
	try {
		statSync(abs);
	} catch {
		console.warn(`skip missing: ${target}`);
		continue;
	}
	for (const file of walk(abs)) {
		const rel = toPosix(relative(root, file));
		const lines = countLines(file);
		const ext = extname(file).toLowerCase() || "(none)";
		const kind = classifyKind(rel);

		totalLines += lines;
		totalFiles += 1;

		const parts = rel.split("/");
		const pkg =
			parts.length >= 2 ? `${parts[0]}/${parts[1]}` : (parts[0] ?? rel);
		bump(byPackage, pkg, lines);
		bump(byExt, ext, lines);
		bump(byKind, kind, lines);
		bump(byPackageKind, `${pkg}\t${kind}`, lines);

		for (const folder of folderBuckets(rel, MAX_DEPTH)) {
			bump(byFolder, folder, lines);
			if (kind === "prod") bump(byFolderProd, folder, lines);
			if (kind === "test") bump(byFolderTest, folder, lines);
		}
	}
}

const pkgRows = [...byPackage.entries()]
	.map(([k, v]) => [k, v.lines, v.files])
	.sort((a, b) => b[1] - a[1]);

const extRows = [...byExt.entries()]
	.map(([k, v]) => [k, v.lines, v.files])
	.sort((a, b) => b[1] - a[1]);

const kindRows = KIND_ORDER.filter((k) => byKind.has(k)).map((k) => {
	const v = byKind.get(k);
	return [KIND_LABEL[k] ?? k, v.lines, v.files];
});

const kindTotal = [...byKind.values()].reduce((s, v) => s + v.lines, 0);

/** Per-package breakdown of non-prod kinds (and prod for context). */
const packageKindFocus = ["prod", "test", "story", "mock", "docs", "script", "bulk"];
const pkgKindRows = [];
for (const [pkg] of pkgRows) {
	for (const kind of packageKindFocus) {
		const v = byPackageKind.get(`${pkg}\t${kind}`);
		if (!v || v.lines === 0) continue;
		pkgKindRows.push([`${pkg} · ${kind}`, v.lines, v.files]);
	}
}

const prod = byKind.get("prod") ?? { lines: 0, files: 0 };
const test = byKind.get("test") ?? { lines: 0, files: 0 };
const story = byKind.get("story") ?? { lines: 0, files: 0 };
const mock = byKind.get("mock") ?? { lines: 0, files: 0 };
const docs = byKind.get("docs") ?? { lines: 0, files: 0 };
const script = byKind.get("script") ?? { lines: 0, files: 0 };
const config = byKind.get("config") ?? { lines: 0, files: 0 };
const styles = byKind.get("styles") ?? { lines: 0, files: 0 };
const bulk = byKind.get("bulk") ?? { lines: 0, files: 0 };
const other = byKind.get("other") ?? { lines: 0, files: 0 };

const nonProdLines =
	test.lines +
	story.lines +
	mock.lines +
	docs.lines +
	script.lines +
	config.lines +
	styles.lines +
	bulk.lines +
	other.lines;

console.log("LOC under apps/ + packages/");
console.log(`root: ${root}`);

printTable("By kind", kindRows, "kind");
printTable("By package · kind", pkgKindRows, "path");
printTable("By package / app (all)", pkgRows, "path");
printFolderTree("By folder · all", byFolder, MAX_DEPTH, MIN);
printFolderTree("By folder · prod only", byFolderProd, MAX_DEPTH, MIN);
printFolderTree("By folder · tests only", byFolderTest, MAX_DEPTH, Math.min(MIN, 50));
if (SHOW_EXT) printTable("By extension", extRows, "ext");

console.log("\nTotals");
console.log("-".repeat(48));
console.log(
	`all                  ${formatInt(totalLines).padStart(12)}  (${formatInt(totalFiles)} files)`,
);
console.log(
	`prod                 ${formatInt(prod.lines).padStart(12)}  (${formatInt(prod.files)} files)`,
);
console.log(
	`test                 ${formatInt(test.lines).padStart(12)}  (${formatInt(test.files)} files)`,
);
console.log(
	`story / mock         ${formatInt(story.lines + mock.lines).padStart(12)}  (${formatInt(story.files + mock.files)} files)`,
);
console.log(
	`docs / scripts       ${formatInt(docs.lines + script.lines).padStart(12)}  (${formatInt(docs.files + script.files)} files)`,
);
console.log(
	`config / styles      ${formatInt(config.lines + styles.lines).padStart(12)}  (${formatInt(config.files + styles.files)} files)`,
);
console.log(
	`bulk / other         ${formatInt(bulk.lines + other.lines).padStart(12)}  (${formatInt(bulk.files + other.files)} files)`,
);
console.log(
	`non-prod sum         ${formatInt(nonProdLines).padStart(12)}`,
);
if (kindTotal > 0) {
	console.log(
		`test / prod ratio    ${prod.lines > 0 ? ((100 * test.lines) / prod.lines).toFixed(1) : "n/a"}%`,
	);
	console.log(
		`prod share           ${((100 * prod.lines) / kindTotal).toFixed(1)}%`,
	);
}
console.log(
	"\nkind rules: test|tests|__tests__|e2e|*.test.*|*.spec.*|*.e2e-spec.*; stories; mocks/fixtures; docs/*.md; scripts; config; css/scss; *.snapshot.json bulk",
);
console.log(
	`options: --depth ${MAX_DEPTH} --min-lines ${MIN}${SHOW_EXT ? "" : " --no-ext"}`,
);

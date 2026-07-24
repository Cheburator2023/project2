#!/usr/bin/env node
/**
 * Vite optimizeDeps иногда:
 *  - оставляет deps_temp_* после прерванного/параллельного --force;
 *  - переписывает chunk-*.js при том же browserHash → браузер 404 на старый chunk.
 *
 * Чистим битый/недописанный кэш до `vite serve`.
 */
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheRoot = path.join(root, ".cache", "vite-app");
const depsDir = path.join(cacheRoot, "deps");
const metadataPath = path.join(depsDir, "_metadata.json");

function wipe(target, reason) {
	if (!existsSync(target)) return;
	console.warn(`[vite-deps] ${reason} — удаляю ${path.relative(root, target)}`);
	rmSync(target, { recursive: true, force: true });
}

function wipeDeps(reason) {
	wipe(depsDir, reason);
}

function listDepsTemps() {
	if (!existsSync(cacheRoot)) return [];
	return readdirSync(cacheRoot)
		.filter((name) => name.startsWith("deps_temp_"))
		.map((name) => path.join(cacheRoot, name));
}

/** Orphan temps = прерванный/параллельный optimize → кэш недоверенный. */
const temps = listDepsTemps();
if (temps.length) {
	for (const temp of temps) {
		wipe(temp, "orphan deps_temp");
	}
	wipeDeps("рядом был deps_temp (гонка optimizeDeps)");
}

if (process.env.VITE_FORCE_DEPS === "1") {
	wipeDeps("VITE_FORCE_DEPS=1");
	process.exit(0);
}

if (!existsSync(depsDir)) {
	process.exit(0);
}

if (!existsSync(metadataPath)) {
	wipeDeps("нет _metadata.json при непустом deps");
	process.exit(0);
}

let metadata;
try {
	metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
} catch {
	wipeDeps("_metadata.json битый");
	process.exit(0);
}

const missing = [];

const optimized = metadata.optimized || {};
for (const entry of Object.values(optimized)) {
	const file = typeof entry === "string" ? entry : entry?.file;
	if (!file || typeof file !== "string") continue;
	const abs = path.join(depsDir, path.basename(file));
	if (!existsSync(abs)) missing.push(path.basename(file));
}

/** Chunks, на которые ссылаются entry и сами chunk-файлы. */
const chunkRefRe = /chunk-[A-Z0-9]+\.js/gi;
const checked = new Set();
for (const file of readdirSync(depsDir)) {
	if (!file.endsWith(".js")) continue;
	let text;
	try {
		text = readFileSync(path.join(depsDir, file), "utf8");
	} catch {
		continue;
	}
	for (const match of text.matchAll(chunkRefRe)) {
		const chunk = match[0];
		if (checked.has(chunk)) continue;
		checked.add(chunk);
		if (!existsSync(path.join(depsDir, chunk))) {
			missing.push(`${chunk}←${file}`);
		}
	}
}

if (missing.length) {
	wipeDeps(
		`битые ссылки (${[...new Set(missing)].slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""})`,
	);
}

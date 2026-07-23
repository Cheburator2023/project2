#!/usr/bin/env node
/**
 * Vite optimizeDeps иногда оставляет _metadata.json со ссылками на chunk-*.js,
 * которых уже нет → 404 и вечный лоадер. Чистим deps только при поломке.
 */
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheRoot = path.join(root, ".cache", "vite-app");
const depsDir = path.join(cacheRoot, "deps");
const metadataPath = path.join(depsDir, "_metadata.json");

function wipeDeps(reason) {
	console.warn(`[vite-deps] ${reason} — удаляю ${path.relative(root, depsDir)}`);
	rmSync(depsDir, { recursive: true, force: true });
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

const browserHash = metadata.browserHash || metadata.hash;
const missing = [];

// Старые чанки в deps часто именуются chunk-XXXX.js; metadata держит file hash в browserHash.
for (const file of readdirSync(depsDir)) {
	if (!file.startsWith("chunk-") || !file.endsWith(".js")) continue;
	// просто проверяем, что .map рядом не обязателен
}

// Проверяем entries из metadata: каждый optimized file должен существовать
const optimized = metadata.optimized || {};
for (const entry of Object.values(optimized)) {
	const file = typeof entry === "string" ? entry : entry?.file;
	if (!file || typeof file !== "string") continue;
	const abs = path.join(depsDir, path.basename(file));
	if (!existsSync(abs)) missing.push(path.basename(file));
}

// Chunks, на которые ссылаются собранные deps (import from "./chunk-…")
const chunkRefRe = /chunk-[A-Z0-9]+\.js/gi;
const checked = new Set();
for (const file of readdirSync(depsDir)) {
	if (!file.endsWith(".js") || file.startsWith("chunk-")) continue;
	const abs = path.join(depsDir, file);
	let text;
	try {
		text = readFileSync(abs, "utf8");
	} catch {
		continue;
	}
	for (const match of text.matchAll(chunkRefRe)) {
		const chunk = match[0];
		if (checked.has(chunk)) continue;
		checked.add(chunk);
		if (!existsSync(path.join(depsDir, chunk))) missing.push(chunk);
	}
}

if (missing.length) {
	wipeDeps(
		`битые ссылки (${[...new Set(missing)].slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""})`,
	);
	process.exit(0);
}

if (browserHash && process.env.VITE_FORCE_DEPS === "1") {
	wipeDeps("VITE_FORCE_DEPS=1");
}

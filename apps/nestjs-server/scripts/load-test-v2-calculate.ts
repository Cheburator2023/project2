/**
 * Нагрузка live calculate: N виртуальных пользователей с разными IP
 * (X-Forwarded-For), как 50+ сессий «из разных мест».
 *
 *   cd apps/nestjs-server
 *   NO_ROLES=true npm run test:load:v2-calculate
 *
 * Против уже запущенного API:
 *   LOAD_BASE_URL=http://127.0.0.1:3000 npm run test:load:v2-calculate
 *
 * Env:
 *   LOAD_USERS          default 56
 *   LOAD_DURATION_SEC   default 60
 *   LOAD_THINK_MS       default 700  (debounce анкеты ~600ms)
 *   LOAD_TIMEOUT_MS     default 45000
 *   LOAD_HEAP_MB_MAX    default 1400
 *   LOAD_ERROR_RATE_MAX default 0.02
 *   LOAD_P95_MS_MAX     default 20000
 *   LOAD_BEARER_TOKEN   optional JWT
 *   LOAD_SAME_IP=1      все VU с одного IP (офисный NAT) — ловит 429
 *   LOAD_SKIP_WS=1      только HTTP calculate, без Socket.IO
 *   LOAD_PORT           default 3010 when spawning API
 */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { io, type Socket } from "socket.io-client";

const V2_EDIT_LOCK_WS_NAMESPACE = "/v2-edit-locks";
const WS_JOIN = "lock:join";
const WS_SNAPSHOT = "lock:snapshot";

type Sample = {
	ok: boolean;
	status: number;
	ms: number;
	kind: "calculate" | "form-package" | "health";
	error?: string;
};

type HeapSample = {
	sec: number;
	rssMb: number;
	heapUsedMb: number;
	heapTotalMb: number;
	externalMb: number;
};

type Report = {
	startedAt: string;
	finishedAt: string;
	baseUrl: string;
	users: number;
	durationSec: number;
	thinkMs: number;
	sameIp: boolean;
	templateId: string | null;
	versionId: string | null;
	questionnaireIds: number;
	requests: number;
	ok: number;
	errors: number;
	timeouts: number;
	statusCounts: Record<string, number>;
	latencyMs: { min: number; p50: number; p95: number; p99: number; max: number };
	calculateLatencyMs: {
		min: number;
		p50: number;
		p95: number;
		p99: number;
		max: number;
	};
	rps: number;
	errorRate: number;
	heap: {
		samples: HeapSample[];
		peakHeapUsedMb: number;
		peakRssMb: number;
		startHeapUsedMb: number;
		endHeapUsedMb: number;
	} | null;
	slo: {
		errorRateMax: number;
		p95MsMax: number;
		heapMbMax: number;
		wsConnectErrorRateMax: number;
		pass: boolean;
		failures: string[];
	};
	ws: {
		skip: boolean;
		connectAttempts: number;
		connectOk: number;
		connectErrors: number;
		snapshots: number;
		joinsOk: number;
		joinsDenied: number;
		joinErrors: number;
	};
};

const USERS = Math.max(1, Number(process.env.LOAD_USERS ?? 56));
const DURATION_SEC = Math.max(5, Number(process.env.LOAD_DURATION_SEC ?? 60));
const THINK_MS = Math.max(0, Number(process.env.LOAD_THINK_MS ?? 700));
const TIMEOUT_MS = Math.max(1000, Number(process.env.LOAD_TIMEOUT_MS ?? 45_000));
const HEAP_MB_MAX = Number(process.env.LOAD_HEAP_MB_MAX ?? 1400);
const ERROR_RATE_MAX = Number(process.env.LOAD_ERROR_RATE_MAX ?? 0.02);
const P95_MS_MAX = Number(process.env.LOAD_P95_MS_MAX ?? 20_000);
const SAME_IP = process.env.LOAD_SAME_IP === "1";
const SKIP_WS = process.env.LOAD_SKIP_WS === "1";
const WS_CONNECT_ERROR_RATE_MAX = Number(
	process.env.LOAD_WS_CONNECT_ERROR_RATE_MAX ?? 0.02,
);
const BEARER = process.env.LOAD_BEARER_TOKEN?.trim() || "";
const SPAWN_PORT = process.env.LOAD_PORT ?? "3010";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	const rank = (p / 100) * (sorted.length - 1);
	const lo = Math.floor(rank);
	const hi = Math.ceil(rank);
	if (lo === hi) return sorted[lo] ?? 0;
	const w = rank - lo;
	return (sorted[lo] ?? 0) * (1 - w) + (sorted[hi] ?? 0) * w;
}

function summarize(values: number[]): Report["latencyMs"] {
	const sorted = [...values].sort((a, b) => a - b);
	return {
		min: sorted[0] ?? 0,
		p50: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		p99: percentile(sorted, 99),
		max: sorted[sorted.length - 1] ?? 0,
	};
}

function vuIp(index: number): string {
	if (SAME_IP) return "203.0.113.10";
	const block = Math.floor(index / 250);
	const host = (index % 250) + 1;
	return `203.0.${block}.${host}`;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function readJson(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

function authHeaders(ip: string): Record<string, string> {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		"x-forwarded-for": ip,
	};
	if (BEARER) headers.authorization = `Bearer ${BEARER}`;
	return headers;
}

type WsCounters = Report["ws"];

function connectSocket(
	baseUrl: string,
	namespace: string,
	label: string,
	snapshotEvent: string,
): Promise<{ client: Socket; snapshot: boolean }> {
	return new Promise((resolveConnect, rejectConnect) => {
		const client = io(`${baseUrl}${namespace}`, {
			path: "/socket.io",
			transports: ["websocket"],
			auth: { lockedByLabel: label, ...(BEARER ? { token: BEARER } : {}) },
			reconnection: false,
			timeout: 8_000,
		});
		let snapshot = false;
		const onSnapshot = () => {
			snapshot = true;
		};
		client.once(snapshotEvent, onSnapshot);
		const timer = setTimeout(() => {
			client.removeAllListeners();
			client.disconnect();
			rejectConnect(new Error("ws timeout"));
		}, 8_000);
		client.once("connect", () => {
			const finish = () => {
				clearTimeout(timer);
				resolveConnect({ client, snapshot });
			};
			if (snapshot) {
				finish();
				return;
			}
			const wait = setTimeout(finish, 5_000);
			client.once(snapshotEvent, () => {
				snapshot = true;
				clearTimeout(wait);
				finish();
			});
		});
		client.once("connect_error", (error) => {
			clearTimeout(timer);
			client.removeAllListeners();
			client.disconnect();
			rejectConnect(error);
		});
	});
}

async function emitJoin(
	client: Socket,
	event: string,
	payload: Record<string, string>,
): Promise<"ok" | "denied" | "error"> {
	try {
		const ack = (await client
			.timeout(8_000)
			.emitWithAck(event, payload)) as { ok?: boolean };
		return ack?.ok === true ? "ok" : "denied";
	} catch {
		return "error";
	}
}

function stage210FormData(vu: number, tick: number): Record<string, unknown> {
	return {
		detailInfo: {
			sourceSystems: [
				{
					name: `Название источника тест VU${vu} t${tick}`,
					type: "Внутренний",
				},
			],
		},
	};
}

async function waitForHealth(
	baseUrl: string,
	timeoutMs: number,
	child: ChildProcess | null,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	let lastError = "timeout";
	while (Date.now() < deadline) {
		if (child && child.exitCode != null) {
			throw new Error(`API процесс завершился с кодом ${child.exitCode}`);
		}
		try {
			const res = await fetch(`${baseUrl}/health`, {
				signal: AbortSignal.timeout(3000),
			});
			if (res.ok) return;
			lastError = `HTTP ${res.status}`;
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
		}
		await sleep(1000);
	}
	throw new Error(`API не поднялся за ${timeoutMs}ms (${lastError})`);
}

function pidsListeningOnPort(port: string): number[] {
	try {
		const out = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		return out
			.split(/\s+/)
			.map((value) => Number(value))
			.filter((pid) => Number.isInteger(pid) && pid > 0);
	} catch {
		return [];
	}
}

function stopSpawnedApi(child: ChildProcess | null): void {
	for (const pid of pidsListeningOnPort(SPAWN_PORT)) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			/* already gone */
		}
	}
	if (child?.pid) {
		try {
			child.kill("SIGTERM");
		} catch {
			/* already gone */
		}
	}
}

function spawnApi(): ChildProcess {
	const child = spawn(
		"npx",
		["nest", "start", "--exec", "node --require tsx/cjs"],
		{
			cwd: ROOT,
			env: {
				...process.env,
				NO_ROLES: process.env.NO_ROLES ?? "true",
				PORT: SPAWN_PORT,
				DB_LOGGING: "false",
				LOGGING: "false",
				NODE_TLS_REJECT_UNAUTHORIZED: "0",
				NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=1800"]
					.filter(Boolean)
					.join(" "),
			},
			stdio: ["ignore", "ignore", "pipe"],
		},
	);
	child.stderr?.on("data", (chunk: Buffer) => {
		const text = chunk.toString();
		if (/ERROR|FATAL|heap|EADDRINUSE/i.test(text)) {
			process.stderr.write(`[api] ${text}`);
		}
	});
	return child;
}

async function discoverTarget(baseUrl: string): Promise<{
	templateId: string;
	versionId: string | null;
	questionnaireIds: string[];
}> {
	const templatesRes = await fetch(`${baseUrl}/v2/templates`, {
		headers: authHeaders("203.0.113.1"),
		signal: AbortSignal.timeout(30_000),
	});
	if (!templatesRes.ok) {
		throw new Error(`GET /v2/templates → ${templatesRes.status}`);
	}
	const templates = (await readJson(templatesRes)) as Array<{
		id: string;
		currentVersionId?: string | null;
	}>;
	const withVersion = templates.find((row) => row.currentVersionId);
	if (!withVersion) {
		throw new Error("Нет шаблона с currentVersionId — нечем грузить calculate");
	}

	let questionnaireIds: string[] = [];
	const listRes = await fetch(`${baseUrl}/v2/questionnaires?page=1&limit=50`, {
		headers: authHeaders("203.0.113.1"),
		signal: AbortSignal.timeout(30_000),
	});
	if (listRes.ok) {
		const page = (await readJson(listRes)) as {
			data?: Array<{ id: string }>;
		};
		questionnaireIds = (page.data ?? []).map((row) => row.id);
	}

	return {
		templateId: withVersion.id,
		versionId: withVersion.currentVersionId ?? null,
		questionnaireIds,
	};
}

async function sampleServerMemory(baseUrl: string): Promise<HeapSample | null> {
	try {
		const res = await fetch(`${baseUrl}/health/memory`, {
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) return null;
		const body = (await readJson(res)) as HeapSample & { status?: string };
		return {
			sec: 0,
			rssMb: body.rssMb,
			heapUsedMb: body.heapUsedMb,
			heapTotalMb: body.heapTotalMb,
			externalMb: body.externalMb,
		};
	} catch {
		return null;
	}
}

async function main(): Promise<void> {
	const startedAt = new Date().toISOString();
	let child: ChildProcess | null = null;
	let baseUrl = (process.env.LOAD_BASE_URL ?? "").replace(/\/$/, "");

	if (!baseUrl) {
		console.log(`Spawning nestjs-server on :${SPAWN_PORT} (NO_ROLES, heap 1800MB)...`);
		child = spawnApi();
		baseUrl = `http://127.0.0.1:${SPAWN_PORT}`;
		try {
			await waitForHealth(baseUrl, 180_000, child);
		} catch (error) {
			stopSpawnedApi(child);
			throw error;
		}
		console.log(`API ready at ${baseUrl}`);
	}

	const t0 = performance.now();
	const heapSamples: HeapSample[] = [];
	const pushHeap = async () => {
		const sample = await sampleServerMemory(baseUrl);
		if (!sample) return;
		heapSamples.push({
			...sample,
			sec: Math.round((performance.now() - t0) / 1000),
		});
	};
	await pushHeap();
	const heapTimer = setInterval(() => {
		void pushHeap();
	}, 2000);

	try {
		const target = await discoverTarget(baseUrl);
		console.log(
			`Load: users=${USERS} duration=${DURATION_SEC}s think=${THINK_MS}ms template=${target.templateId} version=${target.versionId ?? "—"} questionnaires=${target.questionnaireIds.length} sameIp=${SAME_IP} ws=${SKIP_WS ? "off" : "on"}`,
		);

		const calculatePath = target.versionId
			? `/v2/templates/${target.templateId}/calculate?versionId=${encodeURIComponent(target.versionId)}`
			: `/v2/templates/${target.templateId}/calculate`;

		const samples: Sample[] = [];
		const ws: WsCounters = {
			skip: SKIP_WS,
			connectAttempts: 0,
			connectOk: 0,
			connectErrors: 0,
			snapshots: 0,
			joinsOk: 0,
			joinsDenied: 0,
			joinErrors: 0,
		};
		const deadline = Date.now() + DURATION_SEC * 1000;

		const runVu = async (vu: number) => {
			const ip = vuIp(vu);
			const label = `load-vu-${vu}`;
			const questionnaireId =
				target.questionnaireIds.length > 0
					? target.questionnaireIds[vu % target.questionnaireIds.length]
					: null;
			const editorJoin =
				Boolean(questionnaireId) && vu < target.questionnaireIds.length;
			let tick = 0;
			let v2Socket: Socket | null = null;

			if (!SKIP_WS) {
				ws.connectAttempts += 1;
				try {
					const v2 = await connectSocket(
						baseUrl,
						V2_EDIT_LOCK_WS_NAMESPACE,
						label,
						WS_SNAPSHOT,
					);
					v2Socket = v2.client;
					ws.connectOk += 1;
					if (v2.snapshot) ws.snapshots += 1;
					if (editorJoin && questionnaireId) {
						const join = await emitJoin(v2Socket, WS_JOIN, {
							questionnaireId,
							lockedByLabel: label,
						});
						if (join === "ok") ws.joinsOk += 1;
						else if (join === "denied") ws.joinsDenied += 1;
						else ws.joinErrors += 1;
					}
				} catch {
					ws.connectErrors += 1;
				}
			}

			try {

			if (questionnaireId && vu % 5 === 0) {
				const started = performance.now();
				try {
					const res = await fetch(
						`${baseUrl}/v2/questionnaires/${questionnaireId}/form-package`,
						{
							headers: authHeaders(ip),
							signal: AbortSignal.timeout(TIMEOUT_MS),
						},
					);
					samples.push({
						ok: res.ok,
						status: res.status,
						ms: performance.now() - started,
						kind: "form-package",
					});
					if (res.body) await res.body.cancel().catch(() => undefined);
				} catch (error) {
					samples.push({
						ok: false,
						status: 0,
						ms: performance.now() - started,
						kind: "form-package",
						error: error instanceof Error ? error.name : "error",
					});
				}
			}

			while (Date.now() < deadline) {
				tick += 1;
				const started = performance.now();
				try {
					const res = await fetch(`${baseUrl}${calculatePath}`, {
						method: "POST",
						headers: authHeaders(ip),
						body: JSON.stringify({ formData: stage210FormData(vu, tick) }),
						signal: AbortSignal.timeout(TIMEOUT_MS),
					});
					samples.push({
						ok: res.ok,
						status: res.status,
						ms: performance.now() - started,
						kind: "calculate",
					});
					if (res.body) await res.body.cancel().catch(() => undefined);
				} catch (error) {
					const name = error instanceof Error ? error.name : "error";
					samples.push({
						ok: false,
						status: 0,
						ms: performance.now() - started,
						kind: "calculate",
						error: name,
					});
				}
				if (THINK_MS > 0) await sleep(THINK_MS);
			}
			} finally {
				v2Socket?.disconnect();
			}
		};

		await Promise.all(Array.from({ length: USERS }, (_, index) => runVu(index)));
		clearInterval(heapTimer);
		await pushHeap();

		const statusCounts: Record<string, number> = {};
		for (const sample of samples) {
			const key =
				sample.status === 0 ? sample.error ?? "network" : String(sample.status);
			statusCounts[key] = (statusCounts[key] ?? 0) + 1;
		}
		const calculateMs = samples
			.filter((sample) => sample.kind === "calculate")
			.map((sample) => sample.ms);
		const allMs = samples.map((sample) => sample.ms);
		const ok = samples.filter((sample) => sample.ok).length;
		const timeouts = samples.filter(
			(sample) => sample.error === "TimeoutError",
		).length;
		const errors = samples.length - ok;
		const elapsedSec = Math.max(0.001, (performance.now() - t0) / 1000);
		const errorRate = samples.length === 0 ? 1 : errors / samples.length;
		const calculateLatencyMs = summarize(calculateMs);
		const failures: string[] = [];
		if (errorRate > ERROR_RATE_MAX) {
			failures.push(
				`errorRate ${(errorRate * 100).toFixed(2)}% > ${(ERROR_RATE_MAX * 100).toFixed(0)}%`,
			);
		}
		if (calculateLatencyMs.p95 > P95_MS_MAX) {
			failures.push(
				`calculate p95 ${calculateLatencyMs.p95.toFixed(0)}ms > ${P95_MS_MAX}ms`,
			);
		}
		const peakHeapUsedMb = heapSamples.reduce(
			(max, row) => Math.max(max, row.heapUsedMb),
			0,
		);
		const peakRssMb = heapSamples.reduce((max, row) => Math.max(max, row.rssMb), 0);
		if (heapSamples.length > 0 && peakHeapUsedMb > HEAP_MB_MAX) {
			failures.push(`heapUsed ${peakHeapUsedMb}MB > ${HEAP_MB_MAX}MB`);
		}
		const wsConnectErrorRate =
			ws.connectAttempts === 0 ? 0 : ws.connectErrors / ws.connectAttempts;
		if (!SKIP_WS && wsConnectErrorRate > WS_CONNECT_ERROR_RATE_MAX) {
			failures.push(
				`ws connect errorRate ${(wsConnectErrorRate * 100).toFixed(2)}% > ${(WS_CONNECT_ERROR_RATE_MAX * 100).toFixed(0)}%`,
			);
		}

		const report: Report = {
			startedAt,
			finishedAt: new Date().toISOString(),
			baseUrl,
			users: USERS,
			durationSec: DURATION_SEC,
			thinkMs: THINK_MS,
			sameIp: SAME_IP,
			templateId: target.templateId,
			versionId: target.versionId,
			questionnaireIds: target.questionnaireIds.length,
			requests: samples.length,
			ok,
			errors,
			timeouts,
			statusCounts,
			latencyMs: summarize(allMs),
			calculateLatencyMs,
			rps: samples.length / elapsedSec,
			errorRate,
			heap:
				heapSamples.length === 0
					? null
					: {
							samples: heapSamples,
							peakHeapUsedMb,
							peakRssMb,
							startHeapUsedMb: heapSamples[0]?.heapUsedMb ?? 0,
							endHeapUsedMb:
								heapSamples[heapSamples.length - 1]?.heapUsedMb ?? 0,
						},
			slo: {
				errorRateMax: ERROR_RATE_MAX,
				p95MsMax: P95_MS_MAX,
				heapMbMax: HEAP_MB_MAX,
				wsConnectErrorRateMax: WS_CONNECT_ERROR_RATE_MAX,
				pass: failures.length === 0,
				failures,
			},
			ws,
		};

		const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "output");
		mkdirSync(outDir, { recursive: true });
		const outFile = resolve(outDir, "load-test-v2-calculate.json");
		writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
		console.log(JSON.stringify(report, null, 2));
		console.log(`Wrote ${outFile}`);
		if (!report.slo.pass) {
			console.error(`SLO failed: ${failures.join("; ")}`);
			process.exitCode = 1;
		}
	} finally {
		clearInterval(heapTimer);
		if (child) {
			stopSpawnedApi(child);
			await sleep(800);
			for (const pid of pidsListeningOnPort(SPAWN_PORT)) {
				try {
					process.kill(pid, "SIGKILL");
				} catch {
					/* already gone */
				}
			}
			if (child.exitCode == null) {
				try {
					child.kill("SIGKILL");
				} catch {
					/* already gone */
				}
			}
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

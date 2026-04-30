import { Controller, Get, Header } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { DocsService } from "./docs.service";

@ApiExcludeController()
@Public()
@Controller("docs")
export class DocsController {
	constructor(private readonly docsService: DocsService) {}

	@Get("db.json")
	getDatabaseDocs() {
		return this.docsService.getDatabaseDocs();
	}

	@Get("db")
	@Header("Content-Type", "text/html; charset=utf-8")
	getDatabaseDocsPage(): string {
		const docs = this.docsService.getDatabaseDocs();
		return this.renderPage(docs);
	}

	private renderPage(docs: ReturnType<DocsService["getDatabaseDocs"]>): string {
		const encodedDiagram = this.escapeHtml(docs.mermaid);
		const docsJson = this.escapeJsonForHtml(docs);
		const jsonbCards = docs.jsonbDocuments
			.map(
				(document) => `<article class="jsonb-card">
					<h3>${this.escapeHtml(document.tableName)}.${this.escapeHtml(document.columnName)}</h3>
					<p>${this.escapeHtml(document.description)}</p>
					<table>
						<thead>
							<tr><th>Field</th><th>Type</th><th>Required</th></tr>
						</thead>
						<tbody>
							${document.fields
								.map(
									(field) => `<tr>
										<td><code>${this.escapeHtml(field.name)}</code></td>
										<td>${this.escapeHtml(field.type)}</td>
										<td>${field.required ? "yes" : "no"}</td>
									</tr>`,
								)
								.join("")}
						</tbody>
					</table>
				</article>`,
			)
			.join("");

		return `<!doctype html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Smart Anketa DB Docs</title>
	<style>
		:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
		body { margin: 0; background: #f8fafc; color: #111827; }
		header { padding: 28px 36px; background: linear-gradient(135deg, #111827, #374151); color: white; }
		h1 { margin: 0 0 8px; font-size: 28px; }
		p { margin: 0; color: #cbd5e1; }
		main { padding: 28px 36px 48px; display: grid; gap: 24px; }
		.card { background: white; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 18px 45px rgba(17, 24, 39, 0.08); padding: 24px; overflow: auto; }
		.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
		a { color: #111827; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
		a:hover { text-decoration: underline; }
		button { border: 1px solid #d1d5db; background: #ffffff; color: #111827; border-radius: 10px; padding: 8px 12px; font-weight: 800; cursor: pointer; }
		button:hover { background: #f3f4f6; }
		.graph-shell { position: relative; height: 720px; border-radius: 18px; background: radial-gradient(circle at 1px 1px, #d1d5db 1px, transparent 0); background-size: 28px 28px; overflow: hidden; border: 1px solid #d1d5db; cursor: grab; }
		.graph-shell:active { cursor: grabbing; }
		.graph-legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 14px; color: #4b5563; font-size: 13px; }
		.graph-controls { position: absolute; right: 14px; top: 14px; z-index: 10; display: flex; align-items: center; gap: 4px; padding: 6px; background: rgba(255, 255, 255, 0.94); border: 1px solid #d1d5db; border-radius: 14px; box-shadow: 0 12px 28px rgba(17, 24, 39, 0.12); backdrop-filter: blur(10px); pointer-events: auto; }
		.graph-controls button { min-width: 34px; padding: 7px 9px; border-radius: 9px; }
		.zoom-value { color: #4b5563; font-weight: 800; min-width: 46px; text-align: center; font-size: 12px; }
		.legend-item { display: inline-flex; gap: 6px; align-items: center; }
		.legend-line { width: 28px; height: 3px; background: #111827; border-radius: 999px; display: inline-block; }
		.graph-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
		.graph-canvas { position: absolute; inset: 0; z-index: 2; transform-origin: 0 0; pointer-events: none; }
		.node { position: absolute; width: 300px; border-radius: 16px; background: #ffffff; border: 1px solid #d1d5db; box-shadow: 0 18px 45px rgba(17, 24, 39, 0.16); cursor: grab; user-select: none; overflow: hidden; pointer-events: auto; }
		.node:active { cursor: grabbing; }
		.node-header { padding: 14px 16px; background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; }
		.node-title-row { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
		.node-title { font-weight: 800; font-size: 16px; }
		.node-subtitle { color: #dbeafe; font-size: 12px; margin-top: 3px; }
		.node-header-badges { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
		.node-body { padding: 12px 14px 14px; max-height: 280px; overflow: auto; }
		.node-warning { margin-bottom: 10px; border: 1px solid #111827; border-radius: 10px; padding: 8px 10px; background: #f9fafb; color: #111827; font-size: 12px; font-weight: 700; }
		.column-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 7px 0; border-bottom: 1px solid #e5e7eb; }
		.column-row.connected { margin: 0 -8px; padding: 7px 8px; border-radius: 10px; background: #f3f4f6; border-bottom-color: transparent; outline: 1px solid #d1d5db; }
		.column-row:last-child { border-bottom: 0; }
		.column-name { font-weight: 700; color: #111827; }
		.column-type { color: #6b7280; font-size: 12px; }
		.edge-label { font: 700 12px Inter, system-ui, sans-serif; fill: #111827; paint-order: stroke; stroke: #ffffff; stroke-width: 4px; }
		.edge-path { fill: none; stroke: #111827; stroke-width: 2.5; marker-end: url(#arrow); filter: drop-shadow(0 1px 2px rgba(17, 24, 39, 0.18)); }
		.jsonb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
		.jsonb-card { border: 1px solid #d1d5db; border-radius: 14px; padding: 18px; background: #ffffff; }
		.jsonb-card h3 { margin: 0; color: #111827; }
		table { width: 100%; border-collapse: collapse; margin-top: 12px; }
		th, td { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 9px 8px; vertical-align: top; }
		th { color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
		.badge { display: inline-block; border-radius: 999px; padding: 3px 8px; font-size: 12px; margin-right: 4px; }
		.primary { background: #111827; color: #ffffff; }
		.unique { background: #e5e7eb; color: #111827; }
		.required { background: #f3f4f6; color: #111827; }
		.muted { background: #f9fafb; color: #4b5563; border: 1px solid #e5e7eb; }
		.relation { background: #e5e7eb; color: #111827; }
		.self-reference { background: rgba(255, 255, 255, 0.2); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.42); }
		.possible-bug { background: #ffffff; color: #111827; border: 1px solid #111827; }
		code, pre { font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace; }
		pre { margin: 0; white-space: pre-wrap; background: #0f172a; color: #e2e8f0; padding: 18px; border-radius: 12px; }
	</style>
</head>
<body>
	<header>
		<h1>Smart Anketa DB Docs</h1>
		<p>Entity metadata, PostgreSQL tables, relations and JSONB document map generated from the running NestJS server.</p>
	</header>
	<main>
		<section class="card toolbar">
			<div>
				<strong>Database node graph</strong><br />
				<span>Drag nodes on the canvas. Links are generated from TypeORM relations.</span>
			</div>
			<nav>
				<button id="layout-button" type="button">Auto layout</button>
				&nbsp;·&nbsp;
				<a href="/api">Swagger UI</a>
				&nbsp;·&nbsp;
				<a href="/docs/db.json">Raw JSON</a>
			</nav>
		</section>
		<section class="card">
			<h2>Tables and relations</h2>
			<div class="graph-legend">
				<span class="legend-item"><span class="legend-line"></span>explicit TypeORM relations + inferred logical relations</span>
				<span class="legend-item">Drag nodes to untangle arrows</span>
			</div>
			<div id="graph-shell" class="graph-shell">
				<div class="graph-controls">
					<button id="zoom-out-button" type="button" title="Zoom out">−</button>
					<span id="zoom-value" class="zoom-value">60%</span>
					<button id="zoom-in-button" type="button" title="Zoom in">+</button>
					<button id="center-button" type="button" title="Center graph">◎</button>
					<button id="reset-view-button" type="button" title="Reset view">↺</button>
				</div>
				<svg id="graph-svg" class="graph-svg">
					<defs>
						<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
							<path d="M 0 0 L 10 5 L 0 10 z" fill="#111827"></path>
						</marker>
					</defs>
				</svg>
				<div id="graph-canvas" class="graph-canvas"></div>
			</div>
		</section>
		<section class="card">
			<h2>JSONB documents</h2>
			<div class="jsonb-grid">${jsonbCards}</div>
		</section>
		<section class="card">
			<h2>Mermaid source</h2>
			<pre>${encodedDiagram}</pre>
		</section>
	</main>
	<script id="docs-data" type="application/json">${docsJson}</script>
	<script>
		const docs = JSON.parse(document.getElementById("docs-data").textContent);
		const shell = document.getElementById("graph-shell");
		const canvas = document.getElementById("graph-canvas");
		const svg = document.getElementById("graph-svg");
		const layoutButton = document.getElementById("layout-button");
		const zoomOutButton = document.getElementById("zoom-out-button");
		const zoomInButton = document.getElementById("zoom-in-button");
		const centerButton = document.getElementById("center-button");
		const resetViewButton = document.getElementById("reset-view-button");
		const zoomValue = document.getElementById("zoom-value");
		const state = new Map();
		const viewport = { x: 0, y: 0, scale: 0.60 };
		const nodeSize = { width: 300, minHeight: 174, headerHeight: 74, rowHeight: 52, bodyPadding: 26, maxBodyHeight: 280 };

		function escapeHtml(value) {
			return String(value)
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;")
				.replaceAll('"', "&quot;")
				.replaceAll("'", "&#039;");
		}

		function initialLayout() {
			const width = shell.clientWidth / viewport.scale || 1100;
			const columns = Math.max(1, Math.floor(width / 460));
			const columnHeights = Array.from({ length: columns }, () => 60);
			docs.entities.forEach((entity, index) => {
				const column = index % columns;
				state.set(entity.tableName, {
					x: 60 + column * 460,
					y: columnHeights[column],
				});
				columnHeights[column] += getNodeHeight(entity) + 96;
			});
		}

		function getNodeHeight(entity) {
			const bodyHeight = Math.min(nodeSize.maxBodyHeight, entity.columns.length * nodeSize.rowHeight + nodeSize.bodyPadding);
			return Math.max(nodeSize.minHeight, nodeSize.headerHeight + bodyHeight);
		}

		function getConnectingColumns(entity) {
			const names = new Set();
			for (const relation of entity.relations) {
				for (const column of relation.joinColumns || []) {
					names.add(column);
				}
				const firstPathSegment = String(relation.propertyName).split(".")[0];
				names.add(firstPathSegment);
			}
			return names;
		}

		function isExpectedSelfReference(relation) {
			const value = [
				relation.type,
				relation.propertyName,
				...(relation.joinColumns || []),
			].join(" ").toLowerCase();
			return value.includes("self") ||
				value.includes("parent") ||
				value.includes("child") ||
				value.includes("tree");
		}

		function getSuspiciousSelfReferences(entity) {
			return entity.relations.filter((relation) =>
				relation.target === entity.tableName && !isExpectedSelfReference(relation),
			);
		}

		function updateViewport() {
			canvas.style.transform = "translate(" + viewport.x + "px, " + viewport.y + "px) scale(" + viewport.scale + ")";
			zoomValue.textContent = Math.round(viewport.scale * 100) + "%";
			renderEdges();
		}

		function getGraphBounds() {
			const positions = Array.from(state.values());
			if (positions.length === 0) {
				return { minX: 0, minY: 0, maxX: nodeSize.width, maxY: nodeSize.minHeight };
			}

			return docs.entities.reduce((bounds, entity) => {
				const position = state.get(entity.tableName);
				if (!position) {
					return bounds;
				}
				return {
					minX: Math.min(bounds.minX, position.x),
					minY: Math.min(bounds.minY, position.y),
					maxX: Math.max(bounds.maxX, position.x + nodeSize.width),
					maxY: Math.max(bounds.maxY, position.y + getNodeHeight(entity)),
				};
			}, {
				minX: Number.POSITIVE_INFINITY,
				minY: Number.POSITIVE_INFINITY,
				maxX: Number.NEGATIVE_INFINITY,
				maxY: Number.NEGATIVE_INFINITY,
			});
		}

		function centerGraph() {
			const bounds = getGraphBounds();
			const graphWidth = bounds.maxX - bounds.minX;
			const graphHeight = bounds.maxY - bounds.minY;
			viewport.x = shell.clientWidth / 2 - (bounds.minX + graphWidth / 2) * viewport.scale;
			viewport.y = shell.clientHeight / 2 - (bounds.minY + graphHeight / 2) * viewport.scale;
			updateViewport();
		}

		function setZoom(nextScale, origin) {
			const clampedScale = Math.min(1.4, Math.max(0.35, nextScale));
			const point = origin || {
				x: shell.clientWidth / 2,
				y: shell.clientHeight / 2,
			};
			const worldX = (point.x - viewport.x) / viewport.scale;
			const worldY = (point.y - viewport.y) / viewport.scale;
			viewport.scale = clampedScale;
			viewport.x = point.x - worldX * viewport.scale;
			viewport.y = point.y - worldY * viewport.scale;
			updateViewport();
		}

		function renderNodes() {
			canvas.innerHTML = docs.entities.map((entity) => {
				const position = state.get(entity.tableName);
				const connectedColumns = getConnectingColumns(entity);
				const selfReferenceCount = entity.relations.filter((relation) => relation.target === entity.tableName).length;
				const suspiciousSelfReferences = getSuspiciousSelfReferences(entity);
				const selfReferenceBadge = selfReferenceCount > 0
					? '<span class="badge self-reference">self reference ×' + selfReferenceCount + "</span>"
					: "";
				const possibleBugBadge = suspiciousSelfReferences.length > 0
					? '<span class="badge possible-bug" title="Suspicious self-reference: relation points to the same table but does not look like parent/child/tree/self relation">possible bug</span>'
					: "";
				const warning = suspiciousSelfReferences.length > 0
					? '<div class="node-warning">Possible relation bug: ' +
						suspiciousSelfReferences.map((relation) => escapeHtml(relation.propertyName)).join(", ") +
						" points to the same table but is not marked as self/parent/child/tree.</div>"
					: "";
				const columns = entity.columns.map((column) => {
					const isConnected = connectedColumns.has(column.databaseName) || connectedColumns.has(column.name);
					const badges = [
						column.isPrimary ? '<span class="badge primary">primary</span>' : "",
						column.isUnique ? '<span class="badge unique">unique</span>' : "",
						column.isNullable
							? '<span class="badge muted">nullable</span>'
							: '<span class="badge required">required</span>',
						isConnected ? '<span class="badge relation">relation</span>' : "",
					].join("");
					return '<div class="column-row' +
						(isConnected ? " connected" : "") +
						'"><div><div class="column-name">' +
						escapeHtml(column.databaseName) +
						'</div><div class="column-type">' +
						escapeHtml(column.type) +
						'</div></div><div>' +
						badges +
						"</div></div>";
				}).join("");

				return '<article class="node" data-table="' +
					escapeHtml(entity.tableName) +
					'" style="transform: translate(' +
					position.x +
					"px, " +
					position.y +
					'px)"><div class="node-header"><div class="node-title-row"><div class="node-title">' +
					escapeHtml(entity.tableName) +
					'</div><div class="node-header-badges">' +
					selfReferenceBadge +
					possibleBugBadge +
					'</div></div><div class="node-subtitle">' +
					escapeHtml(entity.name) +
					'</div></div><div class="node-body">' +
					warning +
					columns +
					"</div></article>";
			}).join("");
			bindDrag();
			updateViewport();
		}

		function renderEdges() {
			const defs = svg.querySelector("defs").outerHTML;
			const width = shell.clientWidth / viewport.scale;
			const height = shell.clientHeight / viewport.scale;
			const originX = -viewport.x / viewport.scale;
			const originY = -viewport.y / viewport.scale;
			svg.setAttribute("viewBox", originX + " " + originY + " " + width + " " + height);
			const edges = [];

			for (const entity of docs.entities) {
				const fromPosition = state.get(entity.tableName);
				if (!fromPosition) continue;
				const fromHeight = getNodeHeight(entity);

				entity.relations.forEach((relation, relationIndex) => {
					if (entity.tableName === relation.target) {
						return;
					}
					const toPosition = state.get(relation.target);
					if (!toPosition) {
						return;
					}
					const targetEntity = docs.entities.find((candidate) => candidate.tableName === relation.target);
					const toHeight = targetEntity ? getNodeHeight(targetEntity) : nodeSize.minHeight;
					const fromCenterX = fromPosition.x + nodeSize.width / 2;
					const toCenterX = toPosition.x + nodeSize.width / 2;
					const fromCenterY = fromPosition.y + fromHeight / 2;
					const toCenterY = toPosition.y + toHeight / 2;
					const leftToRight = fromCenterX <= toCenterX;
					const startX = leftToRight
						? fromPosition.x + nodeSize.width
						: fromPosition.x;
					const startY = fromCenterY + (relationIndex % 3) * 18 - 18;
					const endX = leftToRight
						? toPosition.x
						: toPosition.x + nodeSize.width;
					const endY = toCenterY + (relationIndex % 3) * 18 - 18;
					const direction = leftToRight ? 1 : -1;
					const laneOffset = 72 + relationIndex * 22;
					const midX = leftToRight
						? Math.max(startX + laneOffset, (startX + endX) / 2)
						: Math.min(startX - laneOffset, (startX + endX) / 2);
					const path = "M " + startX + " " + startY + " H " + midX + " V " + endY + " H " + endX;
					const labelX = midX + direction * 8;
					const labelY = (startY + endY) / 2 - 8;
					edges.push('<path class="edge-path" d="' + path + '"></path><text class="edge-label" x="' + labelX + '" y="' + labelY + '">' + escapeHtml(relation.propertyName) + '</text>');
				});
			}

			svg.innerHTML = defs + edges.join("");
		}

		function bindDrag() {
			for (const node of canvas.querySelectorAll(".node")) {
				node.addEventListener("pointerdown", (event) => {
					event.stopPropagation();
					node.setPointerCapture(event.pointerId);
					const tableName = node.dataset.table;
					const position = state.get(tableName);
					const start = { x: event.clientX, y: event.clientY, nodeX: position.x, nodeY: position.y };

					const move = (moveEvent) => {
						const next = {
							x: start.nodeX + (moveEvent.clientX - start.x) / viewport.scale,
							y: start.nodeY + (moveEvent.clientY - start.y) / viewport.scale,
						};
						state.set(tableName, next);
						node.style.transform = "translate(" + next.x + "px, " + next.y + "px)";
						renderEdges();
					};
					const up = () => {
						node.removeEventListener("pointermove", move);
						node.removeEventListener("pointerup", up);
						node.removeEventListener("pointercancel", up);
					};

					node.addEventListener("pointermove", move);
					node.addEventListener("pointerup", up);
					node.addEventListener("pointercancel", up);
				});
			}
		}

		layoutButton.addEventListener("click", () => {
			initialLayout();
			renderNodes();
			centerGraph();
		});
		zoomOutButton.addEventListener("click", () => setZoom(viewport.scale - 0.1));
		zoomInButton.addEventListener("click", () => setZoom(viewport.scale + 0.1));
		centerButton.addEventListener("click", centerGraph);
		resetViewButton.addEventListener("click", () => {
			viewport.scale = 0.60;
			centerGraph();
		});
		shell.addEventListener("wheel", (event) => {
			event.preventDefault();
			const shellRect = shell.getBoundingClientRect();
			const origin = {
				x: event.clientX - shellRect.left,
				y: event.clientY - shellRect.top,
			};
			setZoom(viewport.scale + (event.deltaY > 0 ? -0.08 : 0.08), origin);
		}, { passive: false });
		shell.addEventListener("pointerdown", (event) => {
			if (event.target.closest(".node") || event.target.closest(".graph-controls")) {
				return;
			}
			shell.setPointerCapture(event.pointerId);
			const start = {
				x: event.clientX,
				y: event.clientY,
				viewX: viewport.x,
				viewY: viewport.y,
			};
			const move = (moveEvent) => {
				viewport.x = start.viewX + moveEvent.clientX - start.x;
				viewport.y = start.viewY + moveEvent.clientY - start.y;
				updateViewport();
			};
			const up = () => {
				shell.removeEventListener("pointermove", move);
				shell.removeEventListener("pointerup", up);
				shell.removeEventListener("pointercancel", up);
			};

			shell.addEventListener("pointermove", move);
			shell.addEventListener("pointerup", up);
			shell.addEventListener("pointercancel", up);
		});
		window.addEventListener("resize", () => {
			centerGraph();
		});
		initialLayout();
		renderNodes();
		centerGraph();
	</script>
</body>
</html>`;
	}

	private escapeHtml(value: string): string {
		return value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	private escapeJsonForHtml(value: unknown): string {
		return JSON.stringify(value).replace(/</g, "\\u003c");
	}
}

import { useUpdateNodeInternals, useReactFlow } from "@xyflow/react";
import { useLayoutEffect, useRef } from "react";

/** Синхронизирует width/height узла React Flow с фактическим размером контента. */
export function useRelationsNodeAutoSize(
	nodeId: string,
	minWidth: number,
	contentKey: string,
) {
	const ref = useRef<HTMLDivElement>(null);
	const { setNodes, getZoom } = useReactFlow();
	const updateNodeInternals = useUpdateNodeInternals();

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;

		const measure = () => {
			const zoom = getZoom() || 1;
			const rect = el.getBoundingClientRect();
			const width = Math.max(minWidth, Math.ceil(rect.width / zoom));
			const height = Math.max(1, Math.ceil(rect.height / zoom));

			setNodes((nodes) => {
				let changed = false;
				const next = nodes.map((n) => {
					if (n.id !== nodeId) return n;
					if (n.width === width && n.height === height) return n;
					changed = true;
					return { ...n, width, height };
				});
				return changed ? next : nodes;
			});
			updateNodeInternals(nodeId);
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, [nodeId, minWidth, contentKey, setNodes, getZoom, updateNodeInternals]);

	return ref;
}

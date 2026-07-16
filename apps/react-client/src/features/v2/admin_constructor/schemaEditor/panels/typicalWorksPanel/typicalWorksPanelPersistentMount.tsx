import Box from "@mui/material/Box";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const STASH_ID = "schema-editor-typical-works-stash";

function getStashElement(): HTMLElement {
	let el = document.getElementById(STASH_ID);
	if (!el) {
		el = document.createElement("div");
		el.id = STASH_ID;
		el.hidden = true;
		document.body.appendChild(el);
	}
	return el;
}

const persistentMountEl = (() => {
	const el = document.createElement("div");
	el.style.height = "100%";
	el.style.minHeight = "0";
	el.style.display = "flex";
	el.style.flexDirection = "column";
	el.style.minWidth = "0";
	getStashElement().appendChild(el);
	return el;
})();

/** Держит TypicalWorksPanel смонтированным вне dockview — убирает белый флеш при remount logic-panel. */
export function TypicalWorksPanelPersistentRoot({
	children,
}: {
	children: ReactNode;
}) {
	return createPortal(children, persistentMountEl);
}

/** Слот в Logic workspace: переносит persistent DOM-узел в видимую область. */
export function TypicalWorksPanelMountHost() {
	const hostRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		host.appendChild(persistentMountEl);

		return () => {
			getStashElement().appendChild(persistentMountEl);
		};
	}, []);

	return (
		<Box
			ref={hostRef}
			sx={{
				flex: 1,
				minHeight: 0,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
			}}
		/>
	);
}

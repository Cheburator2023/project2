import type { PropsWithChildren } from "react";

export function Layout({ children }: PropsWithChildren) {
	return (
		<div className="container-fluid" data-test-id="layout--div-0">
			{children}
		</div>
	);
}

import type { PropsWithChildren } from "react";

export function Layout({ children }: PropsWithChildren) {
	return <div className="container-fluid">{children}</div>;
}

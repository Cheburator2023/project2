import { FullScreenLoader } from "@react-client/common/muiCustom/FullScreenLoader";
import type { MainLayoutOutletContext } from "@react-client/common/layouts/mainLayoutOutletContext";
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";

/**
 * Outlet с Suspense для lazy-страниц.
 *
 * React Router 7 оборачивает навигацию в startTransition — без key на Suspense
 * fallback не показывается и остаётся предыдущая страница до загрузки chunk.
 */
export function SuspenseOutlet({
	context,
}: {
	context?: MainLayoutOutletContext;
}) {
	const location = useLocation();

	return (
		<Suspense
			key={location.key}
			fallback={<FullScreenLoader height="100%" />}
		>
			<Outlet context={context} />
		</Suspense>
	);
}

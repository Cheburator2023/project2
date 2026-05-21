import {
	useCalculationControllerFindAll,
} from "@react-client/common/api/queries/calculation";
import {
	HomeTemplete,
} from "@react-client/features/v2/home/pages/HomePage";
import type { CalculationResponseDto } from "@smart-anketa/api-contract";
import { routes as routesV2 } from "@react-client/routing/version/v2/routes";

/** Реестр анкет v2 — тот же ag-grid, что в v1, с маршрутами /v2/... */
export function V2RegistryPage() {
	const { data, isLoading, isFetching, error, refetch } =
		useCalculationControllerFindAll();

	return (
		<HomeTemplete
			data={data as CalculationResponseDto[] | undefined}
			error={error}
			isLoading={isLoading || isFetching}
			refetch={refetch}
			registryRoutes={routesV2}
			pathPrefix="/v2"
		/>
	);
}

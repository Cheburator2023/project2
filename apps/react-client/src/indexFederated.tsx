import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";

import { T_CONFIG_MAP, T_KEYCLOAK_USER } from "types";
import App from "./App";

export type Props = {
	urlConfig?: T_CONFIG_MAP;
	token?: string;
	user?: T_KEYCLOAK_USER;
	userPermissions?: string[];
	navigate?: (to: string) => void;
	protectedFetch?: any;
	bridged?: boolean;
	onLogout?: () => void;
};

const MfeRoot = (props: Props) => {
	console.log("MfeRoot >> props:", props);

	return (
		<AuthProvider token={props.token}>
			<App {...props} bridged />
		</AuthProvider>
	);
};

export default createBridgeComponent({
	rootComponent: MfeRoot,
});

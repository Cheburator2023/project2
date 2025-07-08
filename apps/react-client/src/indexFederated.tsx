import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";
import { useUserStore } from "@react-client/common/store/userStore";
import { Role } from "@react-client/types/roles";
import { getPermissionsByRoles } from "@react-client/utils/rolePermissions";
import { useEffect } from "react";
import type { T_CONFIG_MAP, T_KEYCLOAK_USER } from "types";
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

	const { user } = props;
	const setUsername = useUserStore((state) => state.setUsername);
	const setRoles = useUserStore((state) => state.setRoles);
	const setPermissions = useUserStore((state) => state.setPermissions);

	useEffect(() => {
		if (user?.preferred_username) {
			setUsername(user.preferred_username);
		}
		if (user?.groups) {
			const roles = user.groups.filter((group) =>
				Object.values(Role).includes(group as Role),
			) as Role[];
			setRoles(roles);
			setPermissions(getPermissionsByRoles(roles));
		} else if (user?.realm_access?.roles) {
			const roles = user.realm_access.roles.filter((role) =>
				Object.values(Role).includes(role as Role),
			) as Role[];
			setRoles(roles);
			setPermissions(getPermissionsByRoles(roles));
		}
	}, [user, setUsername, setRoles, setPermissions]);

	return (
		<AuthProvider
			token={props.token}
			data-test-id="index-federated--AuthProvider-0"
		>
			<App {...props} bridged data-test-id="index-federated--App-0" />
		</AuthProvider>
	);
};

export default createBridgeComponent({
	rootComponent: MfeRoot,
});

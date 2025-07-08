import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";
import { useUserStore } from "@react-client/common/store/userStore";
import { Permission, Role } from "@react-client/types/roles";
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
	const { setUsername, setGroups, setRoles, setPermissions } = useUserStore();

	useEffect(() => {
		if (user?.preferred_username) {
			setUsername(user?.preferred_username);
		}

		if (user?.groups) {
			setGroups(user.groups);

			const roles = user.groups.filter((group) =>
				Object.values(Role).includes(group as Role),
			) as Role[];
			setRoles(roles);
		}

		if (user?.realm_access?.roles) {
			const permissions = user.realm_access.roles.filter((permission) =>
				Object.values(Permission).includes(permission as Permission),
			) as Permission[];

			setPermissions(permissions);
		}
	}, [user?.roles, user?.realm_access]);

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

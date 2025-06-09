import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";

import App from "./App";

const MfeRoot = (props: any) => {
	console.log("MfeRoot >> props:", props);

	return (
		<AuthProvider token={props.token}>
			<App {...props} />
		</AuthProvider>
	);
};

export default createBridgeComponent({
	rootComponent: MfeRoot,
});

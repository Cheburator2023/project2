import { createBridgeComponent } from "@module-federation/bridge-react/v19";

import App from "./App";

const MfeRoot = (props: any) => {
	console.log("MfeRoot >> props:", props);

	return <App bridged {...props} />;
};

export default createBridgeComponent({
	rootComponent: MfeRoot,
});

import React from "react";

export const useEffectOnce = (callback: () => void, when: boolean): void => {
	const hasRunOnce = React.useRef(false);
	React.useEffect(() => {
		if (when && !hasRunOnce.current) {
			callback();
			hasRunOnce.current = true;
		}
	}, [when, callback]);
};

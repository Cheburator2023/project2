import {
	type Location,
	type NavigationType,
	type Path,
	UNSAFE_NavigationContext as NavigationContext,
	parsePath,
	useLocation,
} from "react-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

export type BrowserRouterBlockerTransition = {
	currentLocation: Location;
	nextLocation: Location;
	historyAction: NavigationType;
};

export type BrowserRouterBlocker = {
	state: "unblocked" | "blocked" | "proceeding";
	reset: () => void;
	proceed: () => void;
};

const IDLE_BLOCKER: BrowserRouterBlocker = {
	state: "unblocked",
	reset: () => {},
	proceed: () => {},
};

function stripBasename(pathname: string, basename: string): string {
	if (!basename || basename === "/") return pathname;
	if (!pathname.startsWith(basename)) return pathname;
	const stripped = pathname.slice(basename.length);
	return stripped === "" ? "/" : stripped;
}

function toNextLocation(
	to: string | Partial<Path>,
	current: Location,
): Location {
	if (typeof to === "string") {
		const parsed = parsePath(to);
		return {
			pathname: parsed.pathname ?? current.pathname,
			search: parsed.search ?? "",
			hash: parsed.hash ?? "",
			state: null,
			key: "default",
		};
	}

	return {
		pathname: to.pathname ?? current.pathname,
		search: to.search ?? current.search,
		hash: to.hash ?? current.hash,
		state: null,
		key: "default",
	};
}

function shouldBlockTransition(
	shouldBlock:
		| boolean
		| ((transition: BrowserRouterBlockerTransition) => boolean),
	transition: BrowserRouterBlockerTransition,
): boolean {
	return typeof shouldBlock === "function"
		? shouldBlock(transition)
		: shouldBlock;
}

export function useBrowserRouterNavigationBlocker(
	shouldBlock:
		| boolean
		| ((transition: BrowserRouterBlockerTransition) => boolean),
): BrowserRouterBlocker {
	const navigation = useContext(NavigationContext);
	const location = useLocation();
	const locationRef = useRef(location);
	locationRef.current = location;

	const shouldBlockRef = useRef(shouldBlock);
	shouldBlockRef.current = shouldBlock;

	const [blockerState, setBlockerState] = useState<
		BrowserRouterBlocker["state"]
	>("unblocked");
	const pendingRetryRef = useRef<(() => void) | null>(null);
	const pendingTransitionRef = useRef<BrowserRouterBlockerTransition | null>(
		null,
	);
	const isProceedingRef = useRef(false);

	const reset = useCallback(() => {
		pendingRetryRef.current = null;
		pendingTransitionRef.current = null;
		setBlockerState("unblocked");
	}, []);

	const proceed = useCallback(() => {
		const retry = pendingRetryRef.current;
		pendingRetryRef.current = null;
		if (!retry) {
			setBlockerState("unblocked");
			return;
		}

		setBlockerState("proceeding");
		isProceedingRef.current = true;
		try {
			retry();
		} finally {
			isProceedingRef.current = false;
			setBlockerState("unblocked");
		}
	}, []);

	useEffect(() => {
		if (blockerState !== "blocked" || !pendingTransitionRef.current) return;
		if (
			!shouldBlockTransition(
				shouldBlockRef.current,
				pendingTransitionRef.current,
			)
		) {
			reset();
		}
	}, [blockerState, reset, shouldBlock]);

	useEffect(() => {
		if (!navigation) return;

		const { basename, navigator } = navigation;
		const originalPush = navigator.push.bind(navigator);
		const originalReplace = navigator.replace.bind(navigator);

		const readWindowLocation = (): Location => ({
			pathname: stripBasename(window.location.pathname, basename),
			search: window.location.search,
			hash: window.location.hash,
			state: null,
			key: "default",
		});

		const tryBlock = (
			historyAction: NavigationType,
			nextLocation: Location,
			retry: () => void,
		): boolean => {
			if (isProceedingRef.current) return false;

			const transition: BrowserRouterBlockerTransition = {
				currentLocation: locationRef.current,
				nextLocation,
				historyAction,
			};
			if (!shouldBlockTransition(shouldBlockRef.current, transition)) {
				return false;
			}

			pendingRetryRef.current = retry;
			pendingTransitionRef.current = transition;
			setBlockerState("blocked");
			return true;
		};

		navigator.push = (...args: Parameters<typeof originalPush>) => {
			const [to] = args;
			const nextLocation = toNextLocation(to, locationRef.current);
			if (
				tryBlock("PUSH", nextLocation, () => {
					originalPush(...args);
				})
			) {
				return;
			}
			originalPush(...args);
		};

		navigator.replace = (...args: Parameters<typeof originalReplace>) => {
			const [to] = args;
			const nextLocation = toNextLocation(to, locationRef.current);
			if (
				tryBlock("REPLACE", nextLocation, () => {
					originalReplace(...args);
				})
			) {
				return;
			}
			originalReplace(...args);
		};

		const onPopState = () => {
			if (isProceedingRef.current) return;

			const nextLocation = readWindowLocation();
			const currentLocation = locationRef.current;
			if (
				!tryBlock("POP", nextLocation, () => {
					originalReplace({
						pathname: nextLocation.pathname,
						search: nextLocation.search,
						hash: nextLocation.hash,
					});
				})
			) {
				return;
			}

			originalReplace({
				pathname: currentLocation.pathname,
				search: currentLocation.search,
				hash: currentLocation.hash,
			});
		};

		window.addEventListener("popstate", onPopState);

		return () => {
			navigator.push = originalPush;
			navigator.replace = originalReplace;
			window.removeEventListener("popstate", onPopState);
		};
	}, [navigation, reset]);

	if (blockerState === "unblocked") {
		return IDLE_BLOCKER;
	}

	return { state: blockerState, reset, proceed };
}

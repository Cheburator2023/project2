import { isDeepEqual } from "@react-client/utils/isDeepEqual";
import { useEffect, useRef } from "react";

const isPrimitive = (value: number | string) =>
	["number", "string", "boolean"].includes(typeof value);

const warnDeps = (dependencies: any[]) => {
	if (dependencies.length === 0) {
		console.warn(
			"useDeepEffect should not be used with no dependencies. Use useEffect instead.",
		);
	}

	if (dependencies.every(isPrimitive)) {
		console.warn(
			"useDeepEffect should not be used with primitive values. Use useEffect instead.",
		);
	}
};

const getTriggerDeps = (
	dependencies: any[],
	comparisonFn: Function,
): number[] => {
	const ref = useRef<React.DependencyList>(undefined);
	const triggerDeps = useRef<number>(0);

	if (!comparisonFn(dependencies, ref.current)) {
		ref.current = dependencies;
		triggerDeps.current = Math.random();
	}

	return [triggerDeps.current];
};

/**
 * Like useEffect, but performs a deep equality check on the dependencies array
 * to determine whether to re-run the effect.
 *
 * If you're using a mutable object in your dependencies array, this can be a
 * convenient alternative to useEffect.
 *
 * @param {React.EffectCallback} fn The effect callback
 * @param {any[]} dependencies The dependencies array
 * @param {Function} comparisonFn The function to compare the dependencies array
 * @returns {void}
 */
export const useDeepEffect = (
	fn: React.EffectCallback,
	dependencies: any[] = [],
	comparisonFn: Function = isDeepEqual,
): void => {
	if (process.env.NODE_ENV !== "production") {
		warnDeps(dependencies);
	}

	// biome-ignore lint/correctness/noVoidTypeReturn: <explanation>
	return useEffect(fn, getTriggerDeps(dependencies, comparisonFn));
};

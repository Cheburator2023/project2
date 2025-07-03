import { createProxy } from "@react-client/common/hooks/createProxy";
import { useMemo, useRef } from "react";
import Mask from "./Mask";
import type { MaskOptions } from "./types";

export default function useMask({
	mask,
	replacement,
	showMask,
	separate,
	track,
	modify,
}: MaskOptions = {}) {
	const $ref = useRef<HTMLInputElement | null>(null);
	const $options = useRef({
		mask,
		replacement,
		showMask,
		separate,
		track,
		modify,
	});

	$options.current.mask = mask;
	$options.current.replacement = replacement;
	$options.current.showMask = showMask;
	$options.current.separate = separate;
	$options.current.track = track;
	$options.current.modify = modify;

	return useMemo(() => {
		return createProxy($ref, new Mask($options.current));
	}, []);
}

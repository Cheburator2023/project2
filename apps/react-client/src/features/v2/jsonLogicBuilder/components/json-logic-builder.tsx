import type { SxProps, Theme } from "@mui/material/styles";
import { useEffect, useMemo, useRef } from "react";
import type { JsonLogicValue } from "../operators";
import { JsonLogicShell } from "../styles/JsonLogicShell";
import {Any} from "./any";

/** Sample data the builder uses for accessor (`var`) suggestions. */
export type JsonLogicData = Record<string, unknown> | unknown[];

type ParseResult = { ok: true; data: JsonLogicData } | { ok: false; error: unknown; raw: string };

export interface JsonLogicBuilderProps {
	onChange: (value: JsonLogicValue) => void;
	value?: JsonLogicValue | undefined;
	data?: JsonLogicData | string | undefined;
	/** Стили оболочки (высота, отступы). */
	shellSx?: SxProps<Theme>;
	/**
	 * Called once whenever `data` is a string and `JSON.parse` fails. The
	 * callback is de-duplicated by raw value, so it fires exactly once per
	 * malformed `data` value even under React's StrictMode double-mount.
	 * If omitted, the parse error is reported via `console.warn`.
	 */
	onDataError?: ((error: unknown, raw: string) => void) | undefined;
}

export function JsonLogicBuilder({
	onChange,
	value = "",
	data = {},
	shellSx,
	onDataError,
}: JsonLogicBuilderProps) {
	const onDataErrorRef = useRef(onDataError);
	onDataErrorRef.current = onDataError;

	const parseResult = useMemo<ParseResult>(() => {
		if (typeof data !== "string") return { ok: true, data };
		try {
			return { ok: true, data: JSON.parse(data) as JsonLogicData };
		} catch (error) {
			return { ok: false, error, raw: data };
		}
	}, [data]);

	const lastReportedRaw = useRef<string | null>(null);
	const failedRaw: string | null = parseResult.ok ? null : parseResult.raw;
	useEffect(() => {
		if (failedRaw === null) {
			lastReportedRaw.current = null;
			return;
		}
		if (lastReportedRaw.current === failedRaw) return;
		lastReportedRaw.current = failedRaw;
		if (parseResult.ok) return;
		const cb = onDataErrorRef.current;
		if (cb) cb(parseResult.error, parseResult.raw);
		else console.warn("[jsonLoginBuilder] data prop is not valid JSON:", parseResult.error);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- parseResult is keyed via failedRaw
	}, [failedRaw]);

	const parsedData: JsonLogicData = parseResult.ok ? parseResult.data : {};

	return (
		<JsonLogicShell sx={shellSx}>
			<span data-rjl-builder>
				<Any parent="master" data={parsedData} value={value} onChange={onChange} />
			</span>
		</JsonLogicShell>
	);
}

export default JsonLogicBuilder;

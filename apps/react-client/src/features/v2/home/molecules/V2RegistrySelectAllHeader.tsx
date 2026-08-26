import type { IHeaderParams } from "ag-grid-community";
import { useLayoutEffect, useRef } from "react";
import type { V2QuestionnaireGridContext } from "./V2QuestionnaireNameCell";

/** Чекбокс в шапке: выбрать все строки текущего фильтра на всех страницах. */
export function V2RegistrySelectAllHeader(params: IHeaderParams) {
	const ctx = (params.context ?? {}) as V2QuestionnaireGridContext;
	const selectedCount = ctx.selectedCount ?? 0;
	const allMatching = Boolean(ctx.allMatching);
	const checked = allMatching && selectedCount > 0;
	const indeterminate = selectedCount > 0 && !allMatching;
	const inputRef = useRef<HTMLInputElement>(null);

	useLayoutEffect(() => {
		if (inputRef.current) inputRef.current.indeterminate = indeterminate;
	}, [indeterminate]);

	return (
		<input
			ref={inputRef}
			className="ag-input-field-input ag-checkbox-input"
			type="checkbox"
			checked={checked}
			disabled={Boolean(ctx.selectAllBusy)}
			title={
				checked
					? "Снять выбор со всех страниц"
					: "Выбрать все строки на всех страницах"
			}
			aria-label={
				checked
					? "Снять выбор со всех страниц"
					: "Выбрать все строки на всех страницах"
			}
			data-test-id="anketa-registry-select-all-pages"
			onChange={() => ctx.onToggleSelectAll?.()}
		/>
	);
}

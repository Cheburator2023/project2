import { styled } from "@mui/material/styles";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import { createPortal } from "react-dom";

type V2RegistryPagingPanelProps = {
	page: number;
	limit: number;
	total: number;
	lastPage: number;
	disabled?: boolean;
	onPageChange: (page: number) => void;
	/** Если задан — рендер внутрь `.ag-root-wrapper` (нативные CSS-переменные темы). */
	hostEl?: HTMLElement | null;
};

const Panel = styled("div")`
	align-items: center;
	border-top: var(--ag-footer-row-border, 1px solid rgba(0, 0, 0, 0.12));
	display: flex;
	gap: calc(var(--ag-spacing, 4px) * 4);
	height: max(var(--ag-row-height, 28px), 22px);
	justify-content: flex-end;
	padding: 0 var(--ag-cell-horizontal-padding, 12px);
	flex-shrink: 0;
	user-select: none;
	font-size: var(--ag-font-size, 12px);
	font-family: var(--ag-font-family, inherit);
	color: var(--ag-data-color, inherit);
	background: var(--ag-background-color, transparent);
	box-sizing: border-box;

	.ag-paging-row-summary-panel {
		display: flex;
		align-items: center;
		gap: 0.35em;
		white-space: nowrap;
	}

	.ag-paging-page-summary-panel {
		align-items: center;
		display: flex;
		gap: var(--ag-cell-widget-spacing, 8px);
	}

	.ag-paging-description {
		display: flex;
		align-items: center;
		gap: 0.35em;
		white-space: nowrap;
	}

	.ag-paging-button {
		cursor: pointer;
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		background: transparent;
		padding: 0;
		color: inherit;
		line-height: 0;

		&.ag-disabled {
			cursor: default;
			opacity: 0.5;
			pointer-events: none;
		}

		span.ag-icon {
			display: inline-flex;
			width: 16px;
			height: 16px;
		}

		span.ag-icon svg {
			width: 16px;
			height: 16px;
			display: block;
		}

		span.ag-icon svg [fill="#000"],
		span.ag-icon svg [fill="black"] {
			fill: currentColor;
		}
	}

	.ag-paging-number,
	.ag-paging-row-summary-panel-number {
		font-weight: 500;
	}
`;

function AgIcon({ name }: { name: "first" | "previous" | "next" | "last" }) {
	const html = agGridIconSet[name];
	return (
		<span
			className={`ag-icon ag-icon-${name}`}
			role="presentation"
			// Иконки из того же набора, что и у AG Grid pagination.
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

/**
 * Панель пагинации в разметке/стиле AG Grid (`ag-paging-panel`),
 * но управляет серверными page/limit (не ClientSideRowModel).
 */
export function V2RegistryPagingPanel({
	page,
	limit,
	total,
	lastPage,
	disabled = false,
	onPageChange,
	hostEl,
}: V2RegistryPagingPanelProps) {
	const safeLastPage = Math.max(lastPage, total === 0 ? 0 : 1);
	const currentPage = Math.min(Math.max(page, 1), Math.max(safeLastPage, 1));
	const from = total === 0 ? 0 : (currentPage - 1) * limit + 1;
	const to = total === 0 ? 0 : Math.min(currentPage * limit, total);

	const prevDisabled = disabled || currentPage <= 1 || total === 0;
	const nextDisabled =
		disabled || safeLastPage === 0 || currentPage >= safeLastPage;

	const t = AG_GRID_LOCALE_RU;

	const panel = (
		<Panel className="ag-paging-panel ag-unselectable" role="presentation">
			<div className="ag-paging-row-summary-panel" role="status">
				<span className="ag-paging-row-summary-panel-number">{from}</span>
				<span>{t.to}</span>
				<span className="ag-paging-row-summary-panel-number">{to}</span>
				<span>{t.of}</span>
				<span className="ag-paging-row-summary-panel-number">{total}</span>
			</div>
			<div className="ag-paging-page-summary-panel">
				<button
					type="button"
					className={`ag-button ag-paging-button${prevDisabled ? " ag-disabled" : ""}`}
					aria-label={t.firstPage}
					title={t.firstPage}
					disabled={prevDisabled}
					onClick={() => onPageChange(1)}
				>
					<AgIcon name="first" />
				</button>
				<button
					type="button"
					className={`ag-button ag-paging-button${prevDisabled ? " ag-disabled" : ""}`}
					aria-label={t.previousPage}
					title={t.previousPage}
					disabled={prevDisabled}
					onClick={() => onPageChange(Math.max(1, currentPage - 1))}
				>
					<AgIcon name="previous" />
				</button>
				<span className="ag-paging-description">
					<span>{t.page}</span>
					<span className="ag-paging-number">
						{total === 0 ? 0 : currentPage}
					</span>
					<span>{t.of}</span>
					<span className="ag-paging-number">{safeLastPage}</span>
				</span>
				<button
					type="button"
					className={`ag-button ag-paging-button${nextDisabled ? " ag-disabled" : ""}`}
					aria-label={t.nextPage}
					title={t.nextPage}
					disabled={nextDisabled}
					onClick={() => onPageChange(currentPage + 1)}
				>
					<AgIcon name="next" />
				</button>
				<button
					type="button"
					className={`ag-button ag-paging-button${nextDisabled ? " ag-disabled" : ""}`}
					aria-label={t.lastPage}
					title={t.lastPage}
					disabled={nextDisabled}
					onClick={() => onPageChange(Math.max(safeLastPage, 1))}
				>
					<AgIcon name="last" />
				</button>
			</div>
		</Panel>
	);

	if (!hostEl) return null;
	return createPortal(panel, hostEl);
}

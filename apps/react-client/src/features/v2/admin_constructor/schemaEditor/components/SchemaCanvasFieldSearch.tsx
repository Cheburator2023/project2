import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import type { TreeMethods } from "@minoru/react-dnd-treeview";
import type { NodeModel } from "@minoru/react-dnd-treeview";
import { highlightMatches } from "@react-client/utils/fuzzySearch";
import {
	Fragment,
	useCallback,
	useMemo,
	useRef,
	useState,
	type RefObject,
} from "react";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import {
	buildCanvasFieldSearchOptions,
	filterCanvasFieldSearchOptions,
	listCanvasAncestorNodeIds,
	substringMatchIndexes,
	type CanvasFieldSearchCrumb,
	type CanvasFieldSearchOption,
} from "../schemaCanvasSearch";
import type { SchemaCanvasNodeData } from "../schemaCanvasTree";
import { useSchemaEditor } from "../SchemaEditorContext";

const CANVAS_FIELD_POINTER_ATTR = "data-canvas-field-pointer";

const HighlightedText = styled("span")<{ highlighted?: boolean }>(
	({ highlighted, theme }) => ({
		backgroundColor: highlighted ? theme.palette.warning.light : "transparent",
		fontWeight: highlighted ? 600 : "inherit",
		color: highlighted ? theme.palette.warning.contrastText : "inherit",
	}),
);

function indexesToMatches(
	indexes: ReadonlyArray<number>,
): Array<{ start: number; end: number }> {
	if (!indexes.length) return [];

	const matches: Array<{ start: number; end: number }> = [];
	let start = indexes[0]!;
	let end = indexes[0]!;

	for (let i = 1; i < indexes.length; i++) {
		const index = indexes[i]!;
		if (index === end + 1) {
			end = index;
		} else {
			matches.push({ start, end: end + 1 });
			start = index;
			end = index;
		}
	}
	matches.push({ start, end: end + 1 });
	return matches;
}

function HighlightedLabel({
	text,
	indexes,
}: {
	text: string;
	indexes: ReadonlyArray<number>;
}) {
	const segments = highlightMatches(text, indexesToMatches(indexes));
	return (
		<>
			{segments.map((segment, index) => (
				<HighlightedText key={index} highlighted={segment.highlighted}>
					{segment.text}
				</HighlightedText>
			))}
		</>
	);
}

function crumbMatchIndexes(query: string, text: string): ReadonlyArray<number> {
	return substringMatchIndexes(text, query);
}

function SearchResultBreadcrumbs({
	breadcrumbs,
	query,
}: {
	breadcrumbs: CanvasFieldSearchCrumb[];
	query: string;
}) {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				flexWrap: "wrap",
				columnGap: 0.75,
				rowGap: 0.25,
				minWidth: 0,
			}}
		>
			{breadcrumbs.map((crumb, index) => (
				<Fragment key={`${crumb.id}-${index}`}>
					{index > 0 ? (
						<Typography
							component="span"
							variant="body2"
							color="text.disabled"
							sx={{ px: 0.25, userSelect: "none" }}
						>
							›
						</Typography>
					) : null}
					<Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
						<Typography variant="body2" noWrap sx={{ fontSize: "0.8125rem" }}>
							<HighlightedLabel
								text={crumb.title}
								indexes={crumbMatchIndexes(query, crumb.title)}
							/>
						</Typography>
						<Typography
							variant="caption"
							color="text.secondary"
							fontFamily="monospace"
							noWrap
							sx={{ lineHeight: 1.2 }}
						>
							<HighlightedLabel
								text={crumb.id}
								indexes={crumbMatchIndexes(query, crumb.id)}
							/>
						</Typography>
					</Box>
				</Fragment>
			))}
		</Box>
	);
}

type SearchMatch = {
	option: CanvasFieldSearchOption;
};

function focusCanvasField(pointer: string) {
	requestAnimationFrame(() => {
		const el = document.querySelector(
			`[${CANVAS_FIELD_POINTER_ATTR}="${CSS.escape(pointer)}"]`,
		);
		el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	});
}

export function SchemaCanvasFieldSearch({
	treeData,
	treeRef,
}: {
	treeData: NodeModel<SchemaCanvasNodeData>[];
	treeRef: RefObject<TreeMethods | null>;
}) {
	const { setSelectedPointer } = useSchemaEditor();
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);

	const options = useMemo(
		() => buildCanvasFieldSearchOptions(treeData),
		[treeData],
	);

	const trimmedQuery = query.trim();

	const matches = useMemo((): SearchMatch[] => {
		return filterCanvasFieldSearchOptions(options, trimmedQuery).map(
			(option) => ({ option }),
		);
	}, [options, trimmedQuery]);

	const handleSelect = useCallback(
		(option: CanvasFieldSearchOption) => {
			for (const nodeId of listCanvasAncestorNodeIds(
				treeData,
				option.pointer,
			)) {
				treeRef.current?.open(nodeId);
			}
			setSelectedPointer(option.pointer);
			focusCanvasField(option.pointer);
			setQuery("");
			setOpen(false);
			inputRef.current?.blur();
		},
		[setSelectedPointer, treeData, treeRef],
	);

	const showResults = open && trimmedQuery.length > 0;

	return (
		<ClickAwayListener onClickAway={() => setOpen(false)}>
			<Box sx={{ position: "relative", width: 168, flexShrink: 0 }}>
				<TextField
					inputRef={inputRef}
					size="small"
					placeholder="Поиск…"
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setOpen(true);
					}}
					// onFocus={() => setOpen(true)}
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasSearch}
					slotProps={{
						input: {
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" />
								</InputAdornment>
							),
							sx: { fontSize: "0.8125rem" },
						},
					}}
					sx={{
						width: "100%",
						"& .MuiInputBase-root": { pr: 0.5 },
					}}
				/>
				<Popper
					open={showResults}
					anchorEl={inputRef.current}
					placement="bottom-start"
					style={{ zIndex: 1400 }}
					onClick={(e) => {
						e.stopPropagation();
						setOpen(false);
						inputRef.current?.blur();
					}}
				>
					<Paper
						elevation={4}
						sx={{ mt: 0.5, maxHeight: 680, width: 620, overflow: "auto" }}
					>
						{matches.length === 0 ? (
							<Box sx={{ px: 1.5, py: 1 }}>
								<ListItemText
									primary="Нет совпадений"
									primaryTypographyProps={{
										variant: "body2",
										color: "text.secondary",
									}}
								/>
							</Box>
						) : (
							<List dense disablePadding>
								{matches.map(({ option }) => (
									<ListItemButton
										key={option.pointer}
										onClick={() => handleSelect(option)}
										sx={{ alignItems: "flex-start", py: 1 }}
									>
										<SearchResultBreadcrumbs
											breadcrumbs={option.breadcrumbs}
											query={trimmedQuery}
										/>
									</ListItemButton>
								))}
							</List>
						)}
					</Paper>
				</Popper>
			</Box>
		</ClickAwayListener>
	);
}

export { CANVAS_FIELD_POINTER_ATTR };

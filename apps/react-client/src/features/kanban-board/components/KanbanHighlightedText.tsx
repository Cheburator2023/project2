import Box from "@mui/material/Box";
import { highlightMatches } from "@react-client/utils/fuzzySearch";
import { substringMatchIndexes } from "@react-client/utils/substringSearch";
import type { ReactNode } from "react";

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

export function KanbanHighlightedText({
	text,
	query,
	component = "span",
}: {
	text: string;
	query?: string;
	component?: "span" | "div";
}): ReactNode {
	const trimmed = query?.trim() ?? "";
	if (!trimmed || !text) return text;

	const segments = highlightMatches(
		text,
		indexesToMatches(substringMatchIndexes(text, trimmed)),
	);
	const hasHighlight = segments.some((segment) => segment.highlighted);
	if (!hasHighlight) return text;

	return (
		<Box component={component} sx={{ display: "inline" }}>
			{segments.map((segment, index) =>
				segment.highlighted ? (
					<Box
						component="mark"
						key={`${segment.text}-${index}`}
						sx={{
							bgcolor: (theme) =>
								theme.palette.mode === "dark"
									? "rgba(250, 204, 21, 0.35)"
									: "rgba(250, 204, 21, 0.55)",
							color: "inherit",
							borderRadius: 0.5,
							px: 0.15,
						}}
					>
						{segment.text}
					</Box>
				) : (
					<span key={`${segment.text}-${index}`}>{segment.text}</span>
				),
			)}
		</Box>
	);
}

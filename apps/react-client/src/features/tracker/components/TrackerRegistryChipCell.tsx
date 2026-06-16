import Chip, { type ChipProps } from "@mui/material/Chip";
import { Flex } from "@react-client/common/primitives/Flex";
import type { ReactNode } from "react";

export function TrackerRegistryChipCell({ children }: { children: ReactNode }) {
	return (
		<Flex height="100%" alignItems="center" gap={0.5} wrap="wrap">
			{children}
		</Flex>
	);
}

export function TrackerRegistryChip(props: ChipProps) {
	return <Chip size="small" variant="outlined" {...props} />;
}

type ProjectChipFields = {
	projectCode?: string;
	projectName?: string;
};

export function TrackerProjectChips({
	projectCode,
	projectName,
}: ProjectChipFields) {
	if (!projectCode && !projectName) {
		return null;
	}

	return (
		<TrackerRegistryChipCell>
			{projectCode ? (
				<TrackerRegistryChip
					label={projectCode}
					color="info"
					title={`Код проекта: ${projectCode}`}
				/>
			) : null}
			{projectName ? (
				<TrackerRegistryChip
					label={projectName}
					title={`Проект: ${projectName}`}
				/>
			) : null}
		</TrackerRegistryChipCell>
	);
}

type BoardChipFields = {
	boardSlug?: string;
	boardName?: string;
};

export function TrackerBoardChips({ boardSlug, boardName }: BoardChipFields) {
	if (!boardSlug && !boardName) {
		return null;
	}

	return (
		<TrackerRegistryChipCell>
			{boardSlug ? (
				<TrackerRegistryChip
					label={boardSlug}
					color="secondary"
					title={`Slug доски: ${boardSlug}`}
				/>
			) : null}
			{boardName ? (
				<TrackerRegistryChip
					label={boardName}
					title={`Доска: ${boardName}`}
				/>
			) : null}
		</TrackerRegistryChipCell>
	);
}

export const trackerProjectFilterText = ({
	projectCode,
	projectName,
}: ProjectChipFields) => [projectCode, projectName].filter(Boolean).join(" ");

export const trackerBoardFilterText = ({
	boardSlug,
	boardName,
}: BoardChipFields) => [boardSlug, boardName].filter(Boolean).join(" ");

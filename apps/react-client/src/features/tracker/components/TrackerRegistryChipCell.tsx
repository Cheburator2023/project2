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
	const code = projectCode?.trim();
	const name = projectName?.trim();

	if (!code && !name) {
		return null;
	}

	const labels = [code].filter(
		(value, index, array): value is string =>
			Boolean(value) &&
			array.findIndex(
				(item) => item?.trim().toLowerCase() === value?.toLowerCase(),
			) === index,
	);

	return (
		<TrackerRegistryChipCell>
			{labels.map((label) => (
				<TrackerRegistryChip
					key={label}
					label={label}
					color={label === code ? "info" : undefined}
					title={label === code ? `Код проекта: ${label}` : `Проект: ${label}`}
				/>
			))}
		</TrackerRegistryChipCell>
	);
}

type BoardChipFields = {
	boardKey?: string;
	/** @deprecated используйте boardKey */
	boardSlug?: string;
	boardName?: string;
};

export function TrackerBoardChips({
	boardKey,
	boardSlug,
	boardName,
}: BoardChipFields) {
	const key = boardKey?.trim() || boardSlug?.trim();
	if (!key && !boardName) {
		return null;
	}

	return (
		<TrackerRegistryChipCell>
			{key ? (
				<TrackerRegistryChip
					label={key}
					color="secondary"
					title={`Ключ доски: ${key}`}
				/>
			) : null}
		</TrackerRegistryChipCell>
	);
}

export const trackerProjectFilterText = ({
	projectCode,
	projectName,
}: ProjectChipFields) => {
	const code = projectCode?.trim();
	const name = projectName?.trim();
	if (!code && !name) return "";
	if (code && name && code.toLowerCase() === name.toLowerCase()) {
		return name;
	}
	return [code, name].filter(Boolean).join(" ");
};

export const trackerBoardFilterText = ({
	boardKey,
	boardSlug,
	boardName,
}: BoardChipFields) =>
	[boardKey, boardSlug, boardName].filter(Boolean).join(" ");

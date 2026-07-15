import Typography from "@mui/material/Typography";
import { useV2TypicalWorksList } from "@react-client/common/api/queries/v2-works";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { useTypicalWorksListDetailSplit } from "@react-client/features/v2/admin/hooks/useDictionaryListPanelWidth";
import { useEffect, useState } from "react";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	V2TypicalWorkDetail,
	type V2TypicalWorkHeaderState,
} from "./V2TypicalWorkDetail";
import { V2TypicalWorkListPanel } from "./V2TypicalWorkListPanel";

type V2TypicalWorkWorkspaceProps = {
	initialWorkId?: string | null;
	onCreateRequest?: () => void;
	showListCreateButton?: boolean;
	onSelectedWorkChange?: (workId: string | null) => void;
	onCheckedWorksChange?: (works: V2TypicalWorkListItemDto[]) => void;
	onHeaderChange?: (state: V2TypicalWorkHeaderState | null) => void;
};

function WorkSplitResizeHandle({
	onResizeStart,
	active,
}: {
	onResizeStart: (event: React.MouseEvent) => void;
	active: boolean;
}) {
	return (
		<Flex
			role="separator"
			aria-orientation="vertical"
			aria-label="Изменить ширину панели работ"
			title="Потяните, чтобы изменить ширину"
			onMouseDown={onResizeStart}
			flexShrink={0}
			width="10px"
			height="100%"
			position="relative"
			zIndex={2}
			sx={{
				cursor: "col-resize",
				mx: "-4px",
				"&::after": {
					content: '""',
					position: "absolute",
					left: "50%",
					top: 0,
					bottom: 0,
					width: 2,
					transform: "translateX(-50%)",
					borderRadius: 1,
					bgcolor: "divider",
					opacity: active ? 0.55 : 0.2,
					transition: "opacity 0.15s",
				},
				"&:hover::after": {
					opacity: 0.45,
				},
			}}
		/>
	);
}

export function V2TypicalWorkWorkspace({
	initialWorkId,
	onCreateRequest,
	showListCreateButton = true,
	onSelectedWorkChange,
	onCheckedWorksChange,
	onHeaderChange,
}: V2TypicalWorkWorkspaceProps) {
	const { data, isLoading } = useV2TypicalWorksList();
	const items = data?.items ?? [];
	const [selectedId, setSelectedId] = useState<string | null>(initialWorkId ?? null);
	const [quickFilter, setQuickFilter] = useState("");
	const {
		containerRef,
		listWidth,
		isResizing,
		onResizeStart,
	} = useTypicalWorksListDetailSplit();

	const selectedWork = items.find((item) => item.id === selectedId) ?? null;

	useEffect(() => {
		if (initialWorkId) setSelectedId(initialWorkId);
	}, [initialWorkId]);

	useEffect(() => {
		if (!items.length) {
			setSelectedId(null);
			return;
		}
		if (!selectedId || !items.some((item) => item.id === selectedId)) {
			setSelectedId(items[0]?.id ?? null);
		}
	}, [items, selectedId]);

	useEffect(() => {
		onSelectedWorkChange?.(selectedId);
	}, [onSelectedWorkChange, selectedId]);

	useEffect(() => {
		if (!selectedWork) onHeaderChange?.(null);
	}, [onHeaderChange, selectedWork]);

	if (isLoading) {
		return (
			<Typography variant="body2" sx={{ p: 2 }}>
				Загрузка типовых работ…
			</Typography>
		);
	}

	return (
		<Flex
			ref={containerRef}
			flexDirection="row"
			height="100%"
			minHeight="0"
			width="100%"
			gap={4}
		>
			<Flex
				flexDirection="column"
				flexShrink={0}
				height="100%"
				minHeight="0"
				width={listWidth}
				minWidth="320px"
			>
				<V2TypicalWorkListPanel
					items={items}
					selectedId={selectedId}
					quickFilter={quickFilter}
					onQuickFilterChange={setQuickFilter}
					onSelect={setSelectedId}
					onCheckedWorksChange={onCheckedWorksChange}
					onCreate={onCreateRequest}
					showCreateButton={showListCreateButton}
				/>
			</Flex>

			<WorkSplitResizeHandle onResizeStart={onResizeStart} active={isResizing} />

			<Flex flexGrow={1} flexShrink={1} minWidth="260px" minHeight="0" height="100%">
				{selectedWork ? (
					<V2TypicalWorkDetail
						key={selectedWork.id}
						work={selectedWork}
						layout="workspace"
						onHeaderChange={onHeaderChange}
					/>
				) : (
					<Card height="100%" width="100%">
						<Flex
							height="100%"
							alignItems="center"
							justifyContent="center"
							sx={{ p: 3 }}
						>
							<Typography variant="body2" color="text.secondary" textAlign="center">
								{items.length === 0
									? "Создайте первую типовую работу"
									: "Выберите работу в списке слева"}
							</Typography>
						</Flex>
					</Card>
				)}
			</Flex>
		</Flex>
	);
}

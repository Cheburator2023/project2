import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useV2TypicalWorkCard } from "@react-client/common/api/queries/v2-works";
import { useV2Template } from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { TypicalWorkCardView } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/TypicalWorkCardView";
import { resolveEffectiveWorkArchComponentType } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/schemaWorkParameters";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";

export type V2TypicalWorkHeaderState = {
	title: string;
	archComponentType: string;
};

type V2TypicalWorkDetailProps = {
	work: V2TypicalWorkListItemDto;
	layout?: "workspace";
	onHeaderChange?: (state: V2TypicalWorkHeaderState | null) => void;
};

export function V2TypicalWorkDetail({
	work,
	layout = "workspace",
	onHeaderChange,
}: V2TypicalWorkDetailProps) {
	const [streamExecutor, setStreamExecutor] = useState<string | null>(
		work.streams[0] ?? null,
	);

	useEffect(() => {
		setStreamExecutor(work.streams[0] ?? null);
	}, [work.id, work.streams]);

	const templateId = work.templateId?.trim() ?? "";
	const { data: template, isLoading: templateLoading } =
		useV2Template(templateId);
	const templateVersionId = template?.currentVersionId ?? null;

	const {
		data: card,
		isLoading,
		error,
	} = useV2TypicalWorkCard(work.id, streamExecutor, templateVersionId, {
		enabled: Boolean(streamExecutor) && (!templateId || !templateLoading),
	});

	useEffect(() => {
		onHeaderChange?.({
			title: work.name,
			archComponentType: work.archComponentType,
		});
	}, [onHeaderChange, work.archComponentType, work.name]);

	useEffect(() => {
		return () => onHeaderChange?.(null);
	}, [onHeaderChange]);

	return (
		<Card
			height="100%"
			width="100%"
			padding={layout === "workspace" ? "16px" : "12px"}
			sx={{ overflow: "auto" }}
		>
			<Flex flexDirection="column" gap={16}>
				<Flex flexDirection="column" gap={4}>
					<Typography variant="overline" color="text.secondary">
						Карточка работы
					</Typography>
					<Typography variant="h6" fontWeight={700}>
						{work.name}
					</Typography>
				</Flex>

				<Divider />

				<Flex flexDirection="column" gap={8}>
					<Typography variant="subtitle2" fontWeight={700}>
						Атрибуты
					</Typography>
					<Flex flexDirection="column" gap={1.25}>
						<Flex justifyContent="space-between" gap={8}>
							<Typography variant="body2" color="text.secondary">
								Тип компонента
							</Typography>
							<Typography variant="body2" textAlign="right">
								{resolveEffectiveWorkArchComponentType(work.archComponentType)}
							</Typography>
						</Flex>
						<Flex justifyContent="space-between" gap={8}>
							<Typography variant="body2" color="text.secondary">
								Тип работы
							</Typography>
							<Typography variant="body2" textAlign="right">
								{work.workType ?? "—"}
							</Typography>
						</Flex>
						{work.templateName ? (
							<Flex justifyContent="space-between" gap={8}>
								<Typography variant="body2" color="text.secondary">
									Схема
								</Typography>
								<Typography variant="body2" textAlign="right">
									{work.templateName}
								</Typography>
							</Flex>
						) : null}
					</Flex>
				</Flex>

				{work.streams.length > 0 ? (
					<Flex flexDirection="column" gap={8}>
						<Typography variant="subtitle2" fontWeight={700}>
							Стримы
						</Typography>
						<Flex gap={0.75} wrap="wrap">
							{work.streams.map((stream) => (
								<Chip
									key={stream}
									size="small"
									label={stream}
									variant={stream === streamExecutor ? "filled" : "outlined"}
									color={stream === streamExecutor ? "primary" : "default"}
									onClick={() => setStreamExecutor(stream)}
									sx={{ cursor: "pointer" }}
								/>
							))}
						</Flex>
					</Flex>
				) : null}

				<Divider />

				{work.streams.length === 0 ? (
					<Alert severity="info">
						Работа ещё не назначена ни на один стрим. Назначение и настройка
						условий выполняются в редакторе логики шаблона.
					</Alert>
				) : (
					<TypicalWorkCardView
						card={card}
						loading={isLoading || (Boolean(templateId) && templateLoading)}
						error={error ? apiErrorMessage(error) : null}
						availableStreams={work.streams}
						streamExecutor={streamExecutor}
						onStreamChange={setStreamExecutor}
						hideHeader
						embedded
						readOnlyRegistry
					/>
				)}
			</Flex>
		</Card>
	);
}

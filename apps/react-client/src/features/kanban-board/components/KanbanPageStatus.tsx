import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { Flex } from "@react-client/common/primitives/Flex";

type Props = {
	title: string;
	description?: string;
	loading?: boolean;
	action?: ReactNode;
};

/** Центрированный статус страницы (лоадер / пусто / ошибка) вместо Alert. */
export function KanbanPageStatus({
	title,
	description,
	loading = false,
	action,
}: Props) {
	return (
		<Flex
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			flexGrow={1}
			gap={12}
			minHeight="280px"
			sx={{ px: 2, py: 4, textAlign: "center" }}
			data-test-id="kanban-page-status"
		>
			{loading ? <CircularProgress size={36} /> : null}
			<Flex flexDirection="column" gap={6} alignItems="center">
				<Typography variant="subtitle1" fontWeight={700}>
					{title}
				</Typography>
				{description ? (
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ maxWidth: 420 }}
					>
						{description}
					</Typography>
				) : null}
			</Flex>
			{action}
		</Flex>
	);
}

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { V2TypicalWorkWorkspace } from "@react-client/features/v2/admin/organisms/V2TypicalWorkWorkspace";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import { useNavigate, useParams } from "react-router";

export function AdminV2TypicalWorkDetailPage() {
	const { workId } = useParams<{ workId: string }>();
	const navigate = useNavigate();

	if (!workId) {
		return (
			<Flex flexDirection="column">
				<Header />
				<Typography variant="body2" sx={{ p: 2 }}>
					Не указан идентификатор типовой работы
				</Typography>
			</Flex>
		);
	}

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0">
			<Header
				leadingAccessory={
					<Flex gap={1} alignItems="center" minWidth="0">
						<IconButton
							size="small"
							title="К типовым работам"
							onClick={() => navigate(routes.adminV2TypicalWorks.rootPath)}
							aria-label="К типовым работам"
						>
							<ArrowBackIcon />
						</IconButton>
						<Typography variant="subtitle2" component="span" fontWeight={600}>
							Типовые работы
						</Typography>
					</Flex>
				}
			/>
			<Flex flexDirection="column" flexGrow={1} minHeight="0" sx={{ overflow: "hidden" }}>
				<V2TypicalWorkWorkspace initialWorkId={workId} showListCreateButton={false} />
			</Flex>
		</Flex>
	);
}

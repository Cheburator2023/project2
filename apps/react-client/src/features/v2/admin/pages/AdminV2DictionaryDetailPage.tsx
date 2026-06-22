import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { V2DictionaryCreateDialog } from "@react-client/features/v2/admin/organisms/V2DictionaryCreateDialog";
import { V2DictionaryWorkspace } from "@react-client/features/v2/admin/organisms/V2DictionaryWorkspace";
import { useNavigate, useParams } from "react-router";
import { useState } from "react";

export function AdminV2DictionaryDetailPage() {
	const { dictionaryId } = useParams<{ dictionaryId: string }>();
	const navigate = useNavigate();
	const [createOpen, setCreateOpen] = useState(false);

	if (!dictionaryId) {
		return (
			<Flex flexDirection="column">
				<Header />
				<Typography variant="body2" sx={{ p: 2 }}>
					Не указан идентификатор справочника
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
							title="К списку справочников"
							onClick={() => navigate(routes.adminV2Dictionaries.rootPath)}
							aria-label="К списку справочников"
						>
							<ArrowBackIcon />
						</IconButton>
						<Typography variant="subtitle2" component="span" fontWeight={600}>
							Справочники
						</Typography>
					</Flex>
				}
			/>
			<Flex flexDirection="column" flexGrow={1} minHeight="0" sx={{ overflow: "hidden" }}>
				<V2DictionaryWorkspace
					initialDictionaryId={dictionaryId}
					onCreateRequest={() => setCreateOpen(true)}
				/>
			</Flex>
			<V2DictionaryCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
		</Flex>
	);
}

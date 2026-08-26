import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import IconButton from "@mui/material/IconButton";
import { useSmartAnketaApiBaseUrl } from "@react-client/common/api/helpers/getSmartAnketaApiBaseUrl";
import { swaggerUiUrlFromApiBase } from "@react-client/common/api/helpers/resolveSmartAnketaApiBaseUrl";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { commonRoutes } from "@react-client/routing/common/routes";

export function AdminV2SwaggerPage() {
	const swaggerUrl = swaggerUiUrlFromApiBase(useSmartAnketaApiBaseUrl());

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" height="100%">
			<Header fixed title={commonRoutes.adminV2Swagger.name}>
				<IconButton
					component="a"
					href={swaggerUrl}
					target="_blank"
					rel="noreferrer"
					size="small"
					title="Открыть Swagger в новой вкладке"
					aria-label="Открыть Swagger в новой вкладке"
				>
					<OpenInNewIcon fontSize="small" />
				</IconButton>
			</Header>
			<Spacer space={8} />
			<Card padding="0" height="100%" overflow="hidden">
				<iframe
					src={swaggerUrl}
					title="Swagger UI бэкенда"
					aria-label="Swagger UI бэкенда"
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						border: 0,
					}}
				/>
			</Card>
		</Flex>
	);
}

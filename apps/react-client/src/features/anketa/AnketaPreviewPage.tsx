import CompareIcon from "@mui/icons-material/Compare";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from "@mui/material";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaLayout } from "@react-client/features/anketa/AnketaLayout";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { routes } from "@react-client/routing/routes";
import { useNavigate } from "react-router";

export const AnketaPreviewPage = () => {
	const navigate = useNavigate();

	const actions = [
		{
			name: "Создать на основе этого расчета",
			icon: <OpenInNewIcon />,
			onClick: () => {},
		},
		{
			name: "Сравнить расчет",
			icon: <CompareIcon />,
			onClick: () => {
				navigate(routes.home.rootPath + "?isInCompareMode=true");
			},
		},
		{
			name: "Скачать",
			icon: <DownloadIcon />,
			onClick: () => {},
		},
	];
	return (
		<div>
			<Spacer height={6} />
			<Header />
			<Spacer height={12} />
			<Flex width="100%" height="90vh">
				<AnketaLayout />
			</Flex>
			<SpeedDial
				ariaLabel="SpeedDial"
				sx={{ position: "absolute", bottom: 16, right: 16 }}
				icon={<SpeedDialIcon />}
			>
				{actions.map((action) => (
					<SpeedDialAction
						key={action.name}
						icon={action.icon}
						tooltipTitle={action.name}
						onClick={action.onClick}
					/>
				))}
			</SpeedDial>
		</div>
	);
};

import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { ILL_404 } from "@react-client/common/illustrations/ILL_404";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { useLocation, useNavigate } from "react-router";
import { resolve404HomeLabel, resolve404HomePath } from "./page404Home";
import { Spacer } from "@react-client/common/primitives/Spacer";

export function Page404() {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const homePath = resolve404HomePath(pathname);
	const homeLabel = resolve404HomeLabel(pathname);

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			data-test-id="page404--root"
		>
			<Header title="Страница не найдена" data-test-id="page404--Header-0" />
			<Flex
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				flexGrow={1}
				minHeight="0"
				gap={3}
				pad="0 16px 48px"
				data-test-id="page404--content"
			>
				<ILL_404 data-test-id="page404--ILL_404-0" />
				<Spacer space={24} />
				<Typography
					variant="body1"
					color="text.secondary"
					textAlign="center"
					maxWidth={420}
					data-test-id="page404--message"
				>
					Запрошенная страница не существует или была удалена.
				</Typography>
				<Spacer space={12} />
				<Button
					color="primary"
					size="large"
					variant="outlined"
					onClick={() => navigate(homePath)}
					data-test-id="page404--home-button"
				>
					{homeLabel}
				</Button>
			</Flex>
		</Flex>
	);
}

import BlockIcon from "@mui/icons-material/Block";
import Typography from "@mui/material/Typography";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";

/** Заглушка, когда у пользователя нет ни одной доступной страницы (матрица F-05). */
export const NoAccessiblePages = () => (
	<div>
		<Header title="Нет доступа" />
		<Flex
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			minHeight="90vh"
		>
			<BlockIcon color="disabled" sx={{ fontSize: 64 }} />
			<Spacer space={16} />
			<Typography variant="h6" color="text.secondary" gutterBottom>
				Для вас нет доступных страниц в приложении
			</Typography>
			<Typography variant="body2" color="text.secondary">
				Обратитесь к администратору для получения доступа.
			</Typography>
		</Flex>
	</div>
);

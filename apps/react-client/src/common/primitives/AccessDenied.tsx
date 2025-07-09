import BlockIcon from "@mui/icons-material/Block";
import { Box, Typography } from "@mui/material";
import { Header } from "@react-client/features/navigation/organisms/Header";
import React from "react";

interface AccessDeniedProps {
	message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
	message = "У вас нет прав для просмотра этой страницы.",
}) => (
	<div>
		<Header title="Ошибка прав доступа" />
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			minHeight="90vh"
		>
			<BlockIcon color="disabled" sx={{ fontSize: 64, mb: 2 }} />
			<Typography variant="h6" color="text.secondary" gutterBottom>
				{message}
			</Typography>
			<Typography variant="body2" color="text.secondary">
				Обратитесь к администратору для получения доступа.
			</Typography>
		</Box>
	</div>
);

import { Typography } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { V2PlaygroundButton } from "../atoms/V2PlaygroundButton";
import { useV2Templates } from "@react-client/common/api/queries/v2-templates";
import { useCreateV2Template } from "@react-client/common/api/queries/v2-templates";
import { pathForPlaygroundV2Template } from "@react-client/routing/version/v1/routing/routes";
import { useNavigate } from "react-router";

export const V2TemplateList = () => {
	const { data: templates, isLoading } = useV2Templates();
	const createTemplate = useCreateV2Template();
	const navigate = useNavigate();

	const handleCreateTemplate = () => {
		createTemplate.mutate({
			code: `template-${Date.now()}`,
			name: "Новый шаблон",
			description: "Описание шаблона",
		});
	};

	if (isLoading) {
		return <Typography>Загрузка...</Typography>;
	}

	return (
		<Flex flexDirection="column">
			<Flex justifyContent="space-between" alignItems="center">
				<Typography variant="h4">Шаблоны</Typography>
				<V2PlaygroundButton onClick={handleCreateTemplate}>
					Создать шаблон
				</V2PlaygroundButton>
			</Flex>
			<Spacer />
			{templates?.map((template) => (
				<Card key={template.id}>
					<Flex justifyContent="space-between" alignItems="flex-start" gap={2}>
						<Flex flexDirection="column">
							<Typography variant="h6">{template.name}</Typography>
							<Typography variant="body2" color="textSecondary">
								{template.code}
							</Typography>
							<Typography variant="body2">{template.description}</Typography>
						</Flex>

						<V2PlaygroundButton
							onClick={() => navigate(pathForPlaygroundV2Template(template.id))}
						>
							Конструктор
						</V2PlaygroundButton>
					</Flex>
				</Card>
			))}
		</Flex>
	);
};

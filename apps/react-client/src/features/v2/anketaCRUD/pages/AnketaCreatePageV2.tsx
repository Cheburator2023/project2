import { useV2Templates } from "@react-client/common/api/queries/v2-templates";
import { useCreateV2Questionnaire } from "@react-client/common/api/queries/v2-questionnaires";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { AnketaCreateMetaDialog } from "@react-client/features/v2/anketaCRUD/organisms/AnketaCreateMetaDialog";
import { Flex } from "@react-client/common/primitives/Flex";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

/**
 * Создание анкеты: имя → сразу POST на бек → переход в редактирование.
 * Форма до сохранения больше не открывается.
 */
export const AnketaCreatePageV2 = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const requestedTemplateId = searchParams.get("templateId")?.trim() || null;
	const { data: templates, isLoading: templatesLoading } = useV2Templates();
	const createMutation = useCreateV2Questionnaire();
	const [dialogOpen, setDialogOpen] = useState(true);

	const activeTemplate = useMemo(() => {
		if (!templates?.length) return undefined;
		if (requestedTemplateId) {
			const byId = templates.find((t) => t.id === requestedTemplateId);
			if (byId) return byId;
		}
		return templates.find((t) => t.currentVersionId) ?? templates[0];
	}, [requestedTemplateId, templates]);

	const createAndOpen = (calcName: string) => {
		const name = calcName.trim();
		if (!name) {
			toast.error("Укажите название анкеты");
			return;
		}
		if (!activeTemplate?.currentVersionId) {
			toast.error("Нет опубликованной актуальной схемы для создания анкеты");
			return;
		}
		setDialogOpen(false);
		createMutation.mutate(
			{
				templateId: activeTemplate.id,
				calcName: name,
				formData: {},
			},
			{
				onSuccess: (created) => {
					toast.success("Анкета создана");
					navigate(
						`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", created.id)}`,
						{ replace: true },
					);
				},
				onError: (err) => {
					setDialogOpen(true);
					toast.error("Не удалось создать анкету", {
						description: apiErrorMessage(err),
					});
				},
			},
		);
	};

	const creating = createMutation.isPending;

	return (
		<>
			<AnketaCreateMetaDialog
				open={dialogOpen && !creating}
				onCancel={() => navigate(`/v2/${v2Routes.home.rootPath}`)}
				onConfirm={createAndOpen}
			/>
			{(creating || templatesLoading) && (
				<Flex
					flexDirection="column"
					alignItems="center"
					justifyContent="center"
					gap={12}
					height="100%"
					minHeight="240px"
					data-test-id="anketa-create-page--saving"
				>
					<CircularProgress size={28} />
					<Typography variant="body2" color="text.secondary">
						{templatesLoading
							? "Загрузка шаблонов…"
							: "Создание анкеты…"}
					</Typography>
				</Flex>
			)}
		</>
	);
};

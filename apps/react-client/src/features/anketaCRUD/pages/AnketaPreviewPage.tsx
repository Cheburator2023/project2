/** biome-ignore-all lint/correctness/noConstantCondition: <explanation> */

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import ViewComfyIcon from "@mui/icons-material/ViewComfy";
import ViewDayIcon from "@mui/icons-material/ViewDay";
import { Button, IconButton, Typography } from "@mui/material";
import { useCalculationControllerFindOne } from "@react-client/common/api/generated/queries/calculation";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { AnketaBasicLayoutPreview } from "@react-client/features/anketaCRUD/templates/AnketaBasicLayoutPreview";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { usePermissions } from "@react-client/hooks/usePermissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isEmpty } from "lodash-es";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

export const AnketaPreviewPage = () => {
	const params = useParams();
	const calcId = params.id || "";
	const [comfyView, setComfyView] = useState(true);
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState<any>(null);
	const queryClient = useQueryClient();
	const store = useAnketaCRUDFormsStore();
	const { canEditCalculation } = usePermissions();

	console.log("AnketaPreviewPage >> store:", store);

	const {
		anketaPreview_basicInfoForm,
		anketaPreview_projectAssessmentForm,
		reset,
	} = store;

	const {
		data: initialData,
		refetch,
		isPending,
		isError,
	} = useCalculationControllerFindOne(calcId, {
		query: {
			enabled: !!calcId,
		},
	});

	// Custom update mutation (PUT /calculation/:id)
	const updateMutation = useMutation({
		mutationFn: async (updateDto: any) => {
			return apiClient({
				url: `/calculation/${calcId}`,
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				data: updateDto,
			});
		},
		onSuccess: () => {
			setIsEditing(false);
			refetch();
			queryClient.invalidateQueries();
			toast.success("Данные успешно обновлены");
		},
		onError: (error: any) => {
			toast.error("Ошибка обновления данных", {
				description: error?.response?.data?.message,
			});
		},
	});

	const isFormValid = anketaPreview_basicInfoForm?.isValid; // only basic form should be valid
	const formHasErrors = anketaPreview_basicInfoForm?.hasErrors;
	const submitCount = anketaPreview_basicInfoForm?.submitCount;

	const handleEdit = () => {
		setFormData({ ...initialData });
		setIsEditing(true);
	};

	const handleCancel = () => {
		setIsEditing(false);
		setFormData(null);
	};

	const handleSave = () => {
		anketaPreview_basicInfoForm.api?.submit();
		anketaPreview_projectAssessmentForm.api?.submit();
	};

	const performUpdate = () => {
		if (formData) {
			// Only send allowed fields
			// const allowedFields = [
			// 	"calcName",
			// 	"rfd",
			// 	"streamExecutor",
			// 	"department",
			// 	"customerName",
			// 	"comment",
			// ];

			updateMutation.mutate({
				calcName: formData.calcName,
				rfd: formData.rfd,
				streamExecutor: formData.streamExecutor,
				department: formData.department,
				customerName: formData.customerName,
				comment: formData.comment,
			});
		}
	};

	useEffect(() => {
		if (formHasErrors) {
			return;
		}
		if (isFormValid) {
			performUpdate();
		}
	}, [isFormValid, submitCount, formHasErrors]);

	useEffect(() => {
		return () => {
			reset();
		};
	}, []);

	return (
		<div data-test-id="anketa-details-page--div-0">
			<Header calcId={calcId} data-test-id="anketa-details-page--Header-0">
				<IconButton onClick={() => setComfyView(!comfyView)}>
					{!comfyView ? <ViewComfyIcon /> : <ViewDayIcon />}
				</IconButton>
				{!isEditing && canEditCalculation && (
					<IconButton
						onClick={handleEdit}
						title="Редактировать"
						disabled={isEmpty(initialData)}
					>
						<EditIcon />
					</IconButton>
				)}
				{isEditing && canEditCalculation && (
					<>
						<IconButton
							onClick={handleSave}
							title="Сохранить"
							disabled={updateMutation.status === "pending"}
						>
							<SaveIcon />
						</IconButton>
						<IconButton
							onClick={handleCancel}
							title="Отмена"
							disabled={updateMutation.status === "pending"}
						>
							<CloseIcon />
						</IconButton>
					</>
				)}
			</Header>
			{false ? (
				<Flex
					justifyContent="center"
					alignItems="center"
					width="100%"
					height="100%"
				>
					<Card padding="30px">
						<Typography variant="h4">Ошибка!</Typography>
						<Spacer />
						<Button variant="contained" onClick={refetch as any}>
							Перезапросить данные
						</Button>
					</Card>
				</Flex>
			) : (
				<AnketaBasicLayoutPreview
					isPending={isPending}
					isEditing={isEditing}
					initialData={isEditing ? formData : initialData}
					comfyView={comfyView}
					mainInfoDisabled={!isEditing}
					onMainInfoChange={setFormData}
				/>
			)}
		</div>
	);
};

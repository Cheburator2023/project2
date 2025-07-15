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
import { FullScreenLoader } from "@react-client/common/muiCustom/FullScreenLoader";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { AnketaBasicLayoutPreview } from "@react-client/features/anketaCRUD/templates/AnketaBasicLayoutPreview";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";

export const AnketaPreviewPage = () => {
	const params = useParams();
	const calcId = params.id || "";
	const [comfyView, setComfyView] = useState(true);
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState<any>(null);
	const queryClient = useQueryClient();

	const { setApiRef, resetApiRef, ...store } = useAnketaCRUDFormsStore();

	const {
		data: _initialData,
		refetch,
		isFetching,
		isError,
	} = useCalculationControllerFindOne(calcId, {
		query: {
			enabled: !!calcId,
		},
	});

	const initialData = { ..._initialData, calcName: _initialData?.name };

	// Custom update mutation (PUT /calculation/:id)
	const updateMutation = useMutation({
		mutationFn: async (updateDto: any) => {
			console.log("🐸 Pepe said >> mutationFn: >> updateDto:", updateDto);

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
		},
	});

	const handleEdit = () => {
		if (initialData) {
			// Copy all fields from initialData, not just meta fields
			// @ts-ignore
			setFormData({ ...initialData, name: _initialData?.calcName });
			setIsEditing(true);
		}
	};

	const handleCancel = () => {
		setIsEditing(false);
		setFormData(null);
	};

	const handleSave = () => {
		if (formData) {
			// Only send allowed fields
			// const allowedFields = [
			// 	"name",
			// 	"rfd",
			// 	"streamExecutor",
			// 	"department",
			// 	"customerName",
			// 	"comment",
			// ];

			updateMutation.mutate({
				name: formData.calcName,
				rfd: formData.rfd,
				streamExecutor: formData.streamExecutor,
				department: formData.department,
				customerName: formData.customerName,
				comment: formData.comment,
			});
		}
	};

	return (
		<div data-test-id="anketa-details-page--div-0">
			<Header calcId={calcId} data-test-id="anketa-details-page--Header-0">
				<IconButton onClick={() => setComfyView(!comfyView)}>
					{!comfyView ? <ViewComfyIcon /> : <ViewDayIcon />}
				</IconButton>
				{!isEditing && (
					<IconButton onClick={handleEdit} title="Редактировать">
						<EditIcon />
					</IconButton>
				)}
				{isEditing && (
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
			{isError ? (
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
			) : isFetching ? (
				<FullScreenLoader />
			) : (
				<AnketaBasicLayoutPreview
					initialData={isEditing ? formData : initialData}
					comfyView={comfyView}
					mainInfoDisabled={!isEditing}
					onMainInfoChange={setFormData}
				/>
			)}
		</div>
	);
};

import { useState } from "react";
import { Alert, Box, Button, Snackbar, Stack, Typography } from "@mui/material";
import {
    ModelServiceFormValues,
    ModelServiceModal,
} from "./ModelServiceModal";
import { DataSourceFormValues, DataSourceModal } from "./DataSourceModal";
import {
    TotalUncertaintyFormValues,
    TotalUncertaintyModal,
} from "./TotalUncertaintyModal";
import {
    NonStandardTaskFormValues,
    NonStandardTaskModal,
} from "./NonStandardTaskModal";
import { SurveyCopyFormValues, SurveyCopyModal } from "./SurveyCopyModal";

export const ModalExample = () => {
    const [modelModalOpen, setModelModalOpen] = useState(false);
    const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
    const [uncertaintyModalOpen, setUncertaintyModalOpen] = useState(false);
    const [nonStandardTaskModalOpen, setNonStandardTaskModalOpen] = useState(false);
    const [surveyCopyModalOpen, setSurveyCopyModalOpen] = useState(false);
    const [savedModelService, setSavedModelService] = useState<ModelServiceFormValues | null>(null);
    const [savedDataSource, setSavedDataSource] = useState<DataSourceFormValues | null>(null);
    const [savedUncertainty, setSavedUncertainty] = useState<TotalUncertaintyFormValues | null>(null);
    const [savedNonStandardTask, setSavedNonStandardTask] = useState<NonStandardTaskFormValues | null>(
        null,
    );
    const [savedSurveyCopy, setSavedSurveyCopy] = useState<SurveyCopyFormValues | null>(null);

    const handleModelClose = () => setModelModalOpen(false);
    const handleDataSourceClose = () => setDataSourceModalOpen(false);
    const handleUncertaintyClose = () => setUncertaintyModalOpen(false);
    const handleNonStandardTaskClose = () => setNonStandardTaskModalOpen(false);
    const handleSurveyCopyClose = () => setSurveyCopyModalOpen(false);

    const handleModelSubmit = (values: ModelServiceFormValues) => {
        setSavedModelService(values);
        setModelModalOpen(false);
    };

    const handleDataSourceSubmit = (values: DataSourceFormValues) => {
        setSavedDataSource(values);
        setDataSourceModalOpen(false);
    };

    const handleUncertaintySubmit = (values: TotalUncertaintyFormValues) => {
        setSavedUncertainty(values);
        setUncertaintyModalOpen(false);
    };

    const handleNonStandardTaskSubmit = (values: NonStandardTaskFormValues) => {
        setSavedNonStandardTask(values);
        setNonStandardTaskModalOpen(false);
    };

    const handleSurveyCopySubmit = (values: SurveyCopyFormValues) => {
        setSavedSurveyCopy(values);
        setSurveyCopyModalOpen(false);
    };

    return (
        <Box sx={{ p: 4 }}>
            <Stack spacing={2} sx={{ maxWidth: 720 }}>
                <Typography variant="h4">Примеры интеграции модальных окон</Typography>
                <Typography variant="body1" color="text.secondary">
                    Откройте любое окно, заполните форму и примените изменения.
                </Typography>

                <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Button variant="contained" onClick={() => setModelModalOpen(true)}>
                        Открыть "Модельный сервис"
                    </Button>
                    <Button variant="outlined" onClick={() => setDataSourceModalOpen(true)}>
                        Открыть "Источник данных"
                    </Button>
                    <Button variant="outlined" onClick={() => setUncertaintyModalOpen(true)}>
                        Открыть "Общая неопределенность"
                    </Button>
                    <Button variant="outlined" onClick={() => setNonStandardTaskModalOpen(true)}>
                        Открыть "Нетиповая задача"
                    </Button>
                    <Button variant="outlined" onClick={() => setSurveyCopyModalOpen(true)}>
                        Открыть "Копирование анкеты"
                    </Button>
                </Box>
            </Stack>

            <ModelServiceModal
                open={modelModalOpen}
                onClose={handleModelClose}
                onSubmit={handleModelSubmit}
                defaultValues={{
                    name: "model1827-v3",
                    channels: ["batch", "online", "llm", "streaming"],
                    pilotRequired: "no",
                    isCreationRequired: "no",
                    newServiceCreationRequired: "no",
                    workType: "development",
                }}
            />

            <DataSourceModal
                open={dataSourceModalOpen}
                onClose={handleDataSourceClose}
                onSubmit={handleDataSourceSubmit}
                defaultValues={{
                    name: "crm_retail",
                    sourceType: "internal",
                    workType: "development",
                    pilotRequired: "yes",
                    configExchange: "required",
                    sourceFor: "dm_retail_scoring_features",
                }}
            />

            <TotalUncertaintyModal
                open={uncertaintyModalOpen}
                onClose={handleUncertaintyClose}
                onSubmit={handleUncertaintySubmit}
                defaultValues={{
                    initiativeTimeline: "Q3 2026",
                    initiativeCost: "15 000 000",
                    totalUncertaintyAdjustment: "12%",
                    risks: {
                        business_change: "medium",
                        solution_defects: "high",
                    },
                }}
            />

            <NonStandardTaskModal
                open={nonStandardTaskModalOpen}
                onClose={handleNonStandardTaskClose}
                onSubmit={handleNonStandardTaskSubmit}
                defaultValues={{
                    name: "Разработка кастомного дашборда мониторинга",
                    reason: "Отсутствие возможности визуализации",
                    estimateHours: "12",
                    coefficient: "1.50",
                    includeInCalculation: true,
                }}
            />

            <SurveyCopyModal
                open={surveyCopyModalOpen}
                onClose={handleSurveyCopyClose}
                onSubmit={handleSurveyCopySubmit}
                defaultValues={{
                    mode: "new_version",
                    surveyName: "",
                }}
            />

            <Snackbar
                open={savedModelService !== null}
                autoHideDuration={3500}
                onClose={() => setSavedModelService(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSavedModelService(null)}
                    severity="success"
                    sx={{ width: "100%" }}
                >
                    Модельный сервис сохранен: {savedModelService?.name || "без названия"}
                </Alert>
            </Snackbar>

            <Snackbar
                open={savedDataSource !== null}
                autoHideDuration={3500}
                onClose={() => setSavedDataSource(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSavedDataSource(null)}
                    severity="success"
                    sx={{ width: "100%" }}
                >
                    Источник данных сохранен: {savedDataSource?.name || "без названия"}
                </Alert>
            </Snackbar>

            <Snackbar
                open={savedUncertainty !== null}
                autoHideDuration={3500}
                onClose={() => setSavedUncertainty(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSavedUncertainty(null)}
                    severity="success"
                    sx={{ width: "100%" }}
                >
                    Общая неопределенность сохранена:{" "}
                    {savedUncertainty?.totalUncertaintyAdjustment || "без значения"}
                </Alert>
            </Snackbar>

            <Snackbar
                open={savedNonStandardTask !== null}
                autoHideDuration={3500}
                onClose={() => setSavedNonStandardTask(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSavedNonStandardTask(null)}
                    severity="success"
                    sx={{ width: "100%" }}
                >
                    Нетиповая задача сохранена: {savedNonStandardTask?.name || "без названия"}
                </Alert>
            </Snackbar>

            <Snackbar
                open={savedSurveyCopy !== null}
                autoHideDuration={3500}
                onClose={() => setSavedSurveyCopy(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert onClose={() => setSavedSurveyCopy(null)} severity="success" sx={{ width: "100%" }}>
                    Режим:{" "}
                    {savedSurveyCopy?.mode === "copy"
                        ? `Скопировать анкету (${savedSurveyCopy.surveyName || "без названия"})`
                        : "Создать новую версию анкеты"}
                </Alert>
            </Snackbar>
        </Box>
    );
}




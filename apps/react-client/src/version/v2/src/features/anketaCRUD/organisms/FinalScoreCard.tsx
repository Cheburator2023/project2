import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
    Divider,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {Flex} from "@react-client/common/primitives/Flex";

type ModelStreamRow = {
    id: string;
    stage: string;
    base: number;
    adjusted?: number;
    deviation?: number;
};

type PlatformStreamRow = {
    id: string;
    stream: string;
    base: number;
    adjusted: number;
    deviation: number;
    atypical: number;
};

const modelStreamData: ModelStreamRow[] = [
    {
        id: '1',
        stage: 'Постановка задачи',
        base: 33,
        adjusted: 25,
        deviation: -25,
    },
    {
        id: '2',
        stage: 'Поиск данных',
        base: 15,
    },
    {
        id: '3',
        stage: 'Построение витрины для разработки',
        base: 52,
    },
    {
        id: '4',
        stage: 'Разработка MVP',
        base: 40,
    },
    {
        id: '5',
        stage: 'Разработка модели',
        base: 37,
        adjusted: 55.5,
        deviation: 35,
    },
    {
        id: '6',
        stage: 'AML разработка',
        base: 68,
    },
    {
        id: '7',
        stage: 'Пилотирование модели',
        base: 34,
    },
    {
        id: '8',
        stage: 'Разработка витрины для применения модели',
        base: 56,
    },
    {
        id: '9',
        stage: 'Адаптация и внедрение',
        base: 50,
    },
];

const platformStreamData: PlatformStreamRow[] = [
    {
        id: '1',
        stream: 'Платформы и решения для моделирования',
        base: 123,
        adjusted: 147,
        deviation: -15,
        atypical: 220,
    },
    {
        id: '2',
        stream: 'Контроль моделей',
        base: 39,
        adjusted: 47,
        deviation: -22,
        atypical: 80,
    },
    {
        id: '3',
        stream: 'Источники данных',
        base: 63,
        adjusted: 85,
        deviation: -18,
        atypical: 76,
    },
];

const getDeviationColor = (value?: number) => {
    if (value === undefined) return 'text.secondary';

    return value > 0 ? '#E53935' : '#2E7D32';
};

const formatDeviation = (value?: number) => {
    if (value === undefined) return '-';

    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const FinalScoreCard: React.FC = () => {
    return (
        <>
            {/* HEADER CARD */}
            <Paper
                elevation={0}
                sx={{
                    padding:'16px',
                    zIndex: 1,
                    borderRadius: 4,
                    mb: 4,
                    boxShadow: '0px 10px 20px rgba(0,0,0,0.2)',
                }}
            >

                            <Flex justifyContent={'space-between'} alignItems={'baseline'}>
                                <Typography
                                    variant="h4"
                                    fontWeight={700}
                                    mb={4}
                                    color="#1F2937"
                                >
                                    Итоговая оценка
                                </Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<FileDownloadOutlinedIcon />}
                                >
                                    ЭКСПОРТ В EXCEL
                                </Button>
                            </Flex>


                            <Stack spacing={2} justifyContent={'space-between'}>
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    sx={{ minWidth: 500 }}
                                >
                                    <Typography color="text.secondary">
                                        Базовая оценка по стриму (СФЕРА):
                                    </Typography>

                                    <Typography fontWeight={700}>452</Typography>
                                </Stack>

                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    sx={{ minWidth: 500 }}
                                >
                                    <Typography color="text.secondary">
                                        Оценка с поправкой на коэффициент сложности:
                                    </Typography>

                                    <Typography fontWeight={700}>74.7</Typography>
                                </Stack>

                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    sx={{ minWidth: 500 }}
                                >
                                    <Typography color="text.secondary">
                                        Отклонение относительно базовой оценки по стриму
                                        (СФЕРА):
                                    </Typography>
                                    <Typography
                                        fontWeight={700}
                                        sx={{ color: '#2E7D32' }}
                                    >
                                        -83.47%
                                    </Typography>
                                </Stack>
                            </Stack>
            </Paper>

            {/* DETAILS */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 4,
                    boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
                    marginTop:'-60px'
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" fontWeight={700} mb={4}>
                        Подробный расчет
                    </Typography>

                    {/* MODEL STREAM */}
                    <Typography variant="h6" fontWeight={700} mb={2}>
                        Модельный стрим
                    </Typography>

                        <Table>
                            <TableHead>
                                <TableRow
                                    sx={{
                                        backgroundColor: '#F9FAFB',
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        Наименование этапа E2E планирования
                                    </TableCell>

                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Базовая оценка
                                    </TableCell>

                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Оценка с поправкой
                                    </TableCell>

                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Отклонение
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {modelStreamData.map((row, index) => (
                                    <TableRow
                                        key={row.id}
                                        sx={{
                                            '&:last-child td': {
                                                borderBottom: 0,
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Stack direction="row" spacing={2}>
                                                <Typography
                                                    color="text.secondary"
                                                    sx={{ minWidth: 28 }}
                                                >
                                                    {String(index + 1).padStart(2, '0')}.
                                                </Typography>

                                                <Typography fontWeight={500}>
                                                    {row.stage}
                                                </Typography>
                                            </Stack>
                                        </TableCell>

                                        <TableCell align="right">
                                            {row.base}
                                        </TableCell>

                                        <TableCell align="right">
                                            {row.adjusted ?? '-'}
                                        </TableCell>

                                        <TableCell
                                            align="right"
                                            sx={{
                                                color: getDeviationColor(row.deviation),
                                                fontWeight: 700,
                                            }}
                                        >
                                            {formatDeviation(row.deviation)}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                <TableRow
                                    sx={{
                                        backgroundColor: '#FAFAFA',
                                    }}
                                >
                                    <TableCell>
                                        <Typography fontWeight={700}>Итого:</Typography>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Typography fontWeight={700}>453</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography fontWeight={700}>80.5</Typography>
                                    </TableCell>

                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>

                    <Divider sx={{ mb: 5 }} />

                    {/* PLATFORM STREAMS */}
                    <Typography variant="h6" fontWeight={700} mb={2}>
                        Платформенные стримы
                    </Typography>

                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            border: '1px solid #E5E7EB',
                            borderRadius: 3,
                            overflow: 'hidden',
                        }}
                    >
                        <Table>
                            <TableHead>
                                <TableRow
                                    sx={{
                                        backgroundColor: '#F9FAFB',
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        Наименование стрима
                                    </TableCell>

                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Базовая оценка
                                    </TableCell>

                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Оценка с поправкой
                                    </TableCell>

                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Отклонение
                                    </TableCell>

                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Оценка нетиповых задач
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {platformStreamData.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <Typography fontWeight={500}>
                                                {row.stream}
                                            </Typography>
                                        </TableCell>

                                        <TableCell align="right">
                                            {row.base}
                                        </TableCell>

                                        <TableCell align="right">
                                            {row.adjusted}
                                        </TableCell>

                                        <TableCell
                                            align="right"
                                            sx={{
                                                color: getDeviationColor(row.deviation),
                                                fontWeight: 700,
                                            }}
                                        >
                                            {formatDeviation(row.deviation)}
                                        </TableCell>

                                        <TableCell align="right">
                                            {row.atypical}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </>
    );
};

export default FinalScoreCard;
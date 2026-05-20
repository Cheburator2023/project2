import React from 'react';
import {
    Box,
    Chip,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

type TableItemProps = {
    name: string;
    workType: string;
    channels: string[];
    pilotRequired: boolean;
    modelClass: string;
    controls: string[];
};

export const TableItem: React.FC<TableItemProps> = ({
                                                 name,
                                                 workType,
                                                 channels,
                                                 pilotRequired,
                                                 modelClass,
                                                 controls,
                                             }) => {
    return (
        <>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1.3fr 1fr 1.2fr 0.8fr 1.2fr 1fr auto',
                    alignItems: 'center',
                    gap: 3,
                    minWidth: 900,
                }}
            >
                {/* Название */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#9CA3AF',
                            fontWeight: 500,
                            mb: 0.5,
                            display: 'block',
                        }}
                    >
                        Название
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                            variant="body1"
                            sx={{
                                fontWeight: 600,
                                color: '#111827',
                            }}
                        >
                            {name}
                        </Typography>

                        <OpenInNewIcon
                            sx={{
                                fontSize: 18,
                                color: '#6B7280',
                                cursor: 'pointer',
                            }}
                        />
                    </Stack>
                </Box>

                {/* Тип работ */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#9CA3AF',
                            fontWeight: 500,
                            mb: 0.5,
                            display: 'block',
                        }}
                    >
                        Тип работ
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{
                            color: '#111827',
                            fontWeight: 500,
                        }}
                    >
                        {workType}
                    </Typography>
                </Box>

                {/* Канал внедрения */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#9CA3AF',
                            fontWeight: 500,
                            mb: 0.5,
                            display: 'block',
                        }}
                    >
                        Канал внедрения
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {channels.map((channel) => (
                            <Chip
                                key={channel}
                                label={channel}
                                size="small"
                                sx={{
                                    backgroundColor: '#F3F4F6',
                                    color: '#374151',
                                    borderRadius: '8px',
                                    fontWeight: 500,
                                }}
                            />
                        ))}
                    </Stack>
                </Box>

                {/* Требуется пилот */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#9CA3AF',
                            fontWeight: 500,
                            mb: 0.5,
                            display: 'block',
                        }}
                    >
                        Требуется пилот
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{
                            color: pilotRequired ? '#059669' : '#DC2626',
                            fontWeight: 600,
                        }}
                    >
                        {pilotRequired ? 'Да' : 'Нет'}
                    </Typography>
                </Box>

                {/* Класс моделей */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#9CA3AF',
                            fontWeight: 500,
                            mb: 0.5,
                            display: 'block',
                        }}
                    >
                        Класс моделей
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#111827',
                            fontWeight: 500,
                        }}
                    >
                        {modelClass}
                    </Typography>
                </Box>

                {/* Вид контроля */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#9CA3AF',
                            fontWeight: 500,
                            mb: 0.5,
                            display: 'block',
                        }}
                    >
                        Вид контроля
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {controls.map((control) => (
                            <Chip
                                key={control}
                                label={control}
                                size="small"
                                sx={{
                                    backgroundColor: '#EEF2FF',
                                    color: '#4338CA',
                                    borderRadius: '8px',
                                    fontWeight: 500,
                                }}
                            />
                        ))}
                    </Stack>
                </Box>

                {/* Action */}
                <IconButton
                    size="small"
                    sx={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '10px',
                        width: 36,
                        height: 36,
                    }}
                >
                    <EditOutlinedIcon fontSize="small" />
                </IconButton>
            </Box>
        </>
    );
};
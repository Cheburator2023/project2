import {
    Accordion,
    AccordionDetails,
    AccordionSummary, Box, Button,
    Chip,
    FormControl,
    Grid,
    InputLabel, Link, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddIcon from "@mui/icons-material/Add";
import React from "react";

const systems = [
    {
        name: "CRM Retail",
        type: "Внутренний",
        replica: true,
        requirements: "Понятны",
        confidential: false,
        nda: false,
    },
    {
        name: "DWH Profile",
        type: "Внутренний",
        replica: false,
        requirements: "Неясны",
        confidential: false,
        nda: false,
    },
];

const statusChip = (label, color) => (
    <Chip
        label={label}
        size="small"
        sx={{
            minWidth: 82,
            fontWeight: 500,
            color: "#fff",
            backgroundColor: color,
        }}
    />
);

export default function DetailedInfo() {
    return (
        <Accordion
            defaultExpanded
            sx={{
                height: 'auto !important',
                borderRadius: 3,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                overflow: "hidden",
            }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h5" fontWeight={700}>
                    Детальная информация
                </Typography>
            </AccordionSummary>

            <AccordionDetails>
                {/* Parameters */}
                <Typography variant="h6" fontWeight={700} mb={3}>
                    Параметры
                </Typography>

                <Grid container spacing={2} mb={4}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Параметр 1</InputLabel>
                            <Select defaultValue="x0.75" label="Параметр 1">
                                <MenuItem value="x0.75">×0.75</MenuItem>
                                <MenuItem value="x1">×1</MenuItem>
                                <MenuItem value="x1.25">×1.25</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Параметр 2</InputLabel>
                            <Select defaultValue="none" label="Параметр 2">
                                <MenuItem value="none">Не требуется</MenuItem>
                                <MenuItem value="required">Требуется</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Параметр 3</InputLabel>
                            <Select defaultValue="+10%" label="Параметр 3">
                                <MenuItem value="+10%">+10%</MenuItem>
                                <MenuItem value="+20%">+20%</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Параметр 4</InputLabel>
                            <Select defaultValue="yes" label="Параметр 4">
                                <MenuItem value="yes">Да</MenuItem>
                                <MenuItem value="no">Нет</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* Systems */}
                <Typography variant="h6" fontWeight={700} mb={2}>
                    Системы источники
                </Typography>

                <TableContainer
                    elevation={0}
                    sx={{
                        border: "1px solid #E5E7EB",
                        borderRadius: 2,
                        overflow: "hidden",
                    }}
                >
                    <Table>
                        <TableHead>
                            <TableRow
                                sx={{
                                    backgroundColor: "#FAFAFA",
                                }}
                            >
                                <TableCell>Название источника</TableCell>
                                <TableCell>Тип</TableCell>
                                <TableCell>Реплика в ДАПП</TableCell>
                                <TableCell>Требования</TableCell>
                                <TableCell>Конфид. данные</TableCell>
                                <TableCell>NDA</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {systems.map((system) => (
                                <TableRow key={system.name} hover>
                                    <TableCell>
                                        <Box
                                            display="flex"
                                            alignItems="center"
                                            gap={1}
                                        >
                                            <Link
                                                href="#"
                                                underline="none"
                                                color="inherit"
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 0.5,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {system.name}
                                                <OpenInNewIcon sx={{ fontSize: 16 }} />
                                            </Link>
                                        </Box>
                                    </TableCell>

                                    <TableCell>{system.type}</TableCell>

                                    <TableCell>
                                        {system.replica
                                            ? statusChip("Есть", "#2E7D32")
                                            : statusChip("Нет", "#D32F2F")}
                                    </TableCell>

                                    <TableCell>
                                        {system.requirements === "Понятны"
                                            ? statusChip("Понятны", "#2E7D32")
                                            : statusChip("Неясны", "#D32F2F")}
                                    </TableCell>

                                    <TableCell>
                                        <Chip label="Нет" size="small" />
                                    </TableCell>

                                    <TableCell>
                                        <Chip label="Нет" size="small" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box mt={3}>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        sx={{
                            textTransform: "uppercase",
                            fontWeight: 600,
                        }}
                    >
                        Добавить систему источник
                    </Button>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
}
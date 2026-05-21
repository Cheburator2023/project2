import * as React from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow, AccordionSummary,
  Accordion,
  AccordionDetails, Divider,
} from '@mui/material';
import { styled } from '@mui/system';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {TableItem} from "@react-client/features/v2/anketaCRUD/organisms/TableItem";

// Интерфейсы типов
interface GeneralInfoProps {}

// Стили для отдельных элементов
const StyledFormControl = styled(FormControl)({
  width: 'calc(50% - 8px)',
});

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const StyledTable = styled(Table)({
  minWidth: 650,
});

export const GeneralInfo = (props: GeneralInfoProps) => {
  const [complexity, setComplexity] = React.useState('3');
  const [pilotRequired, setPilotRequired] = React.useState('Требуется MVP');
  const [serviceCreation, setServiceCreation] = React.useState('Нет');
  const [modelName, setModelName] = React.useState('model1827-v3');
  const [workType, setWorkType] = React.useState('Разработка');

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
          <Typography variant="h6" mb={2}>
            Общая информация
          </Typography>
        </AccordionSummary>

        <AccordionDetails>
    <Box sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: 3 }}>
        <Box display="flex" gap={2} mb={1}>
          <StyledFormControl>
            <InputLabel shrink htmlFor="complexity-select">
              Сложность постановки
            </InputLabel>
            <Select
              labelId="complexity-select"
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              inputProps={{
                style: { paddingLeft: 10 },
              }}
            >
              <MenuItem value={'1'}>1 — Низкая ×1.00</MenuItem>
              <MenuItem value={'2'}>2 — Средняя ×1.25</MenuItem>
              <MenuItem value={'3'} selected>3 — Повышенная ×1.50</MenuItem>
            </Select>
          </StyledFormControl>
          
          <StyledFormControl>
            <InputLabel shrink htmlFor="pilot-select">
              Необходимость пилота
            </InputLabel>
            <Select
              labelId="pilot-select"
              value={pilotRequired}
              onChange={(e) => setPilotRequired(e.target.value)}
              inputProps={{
                style: { paddingLeft: 10 },
              }}
            >
              <MenuItem value={'Требуется MVP'} selected>Требуется MVP</MenuItem>
              <MenuItem value={'Не требуется'}>Не требуется</MenuItem>
            </Select>
          </StyledFormControl>
        </Box>
        
        <Box display="flex" gap={2} mb={1}>
          <StyledFormControl>
            <InputLabel shrink htmlFor="is-service-create">
              Требуется создание ИС
            </InputLabel>
            <Select
              labelId="is-service-create"
              value={'Нет'}
              disabled
              inputProps={{
                style: { paddingLeft: 10 },
              }}
            >
              <MenuItem value={'Нет'}>Нет</MenuItem>
            </Select>
          </StyledFormControl>
          
          <StyledFormControl>
            <InputLabel shrink htmlFor="service-create">
              Требуется создание сервиса
            </InputLabel>
            <Select
              labelId="service-create"
              value={serviceCreation}
              onChange={(e) => setServiceCreation(e.target.value)}
              inputProps={{
                style: { paddingLeft: 10 },
              }}
            >
              <MenuItem value={'Да'}>Да</MenuItem>
              <MenuItem value={'Нет'} selected>Нет</MenuItem>
              </Select>
          </StyledFormControl>
        </Box>
      <Box display="flex" justifyContent={'space-between'} alignItems={'baseline'} gap={2} mb={1}>
        <Typography variant="caption" mb={1}>Общая неопределенность: Средняя ×1.14</Typography>
        <Button
          variant="outlined"
          color="primary"
          sx={{ height: 40, fontSize: 14 }}
        >
          РАССЧИТАТЬ ОБЩУЮ НЕОПРЕДЕЛЕННОСТЬ
        </Button>
      </Box>
      </Box>
      <Divider/>
      {/* Модельный сервис */}
      <Box mt={4}>
        <Typography variant="h6">Модельный сервис</Typography>
        <Box sx={{ p: 4, backgroundColor: '#F9FAFB' }}>
          <TableItem
              name="model1827-v3"
              workType="Разработка"
              channels={['Батч', 'Онлайн', 'LLM']}
              pilotRequired
              modelClass="Розничные модели CRM"
              controls={['КД', 'ТМ', 'ОК', 'АК']}
          />
        </Box>
      </Box>

      {/* Кнопка завершения заполнения */}
          <Box display="flex" justifyContent={'space-between'} alignItems={'baseline'} gap={2} mb={1}>
        <Button
          variant="contained"
          color="primary"
          sx={{ height: 40, fontSize: 14 }}
        >
          ЗАВЕРШИТЬ ЗАПОЛНЕНИЕ ОБЩЕЙ ИНФОРМАЦИИ
        </Button>
      </Box>
        </AccordionDetails>
      </Accordion>
  );
};

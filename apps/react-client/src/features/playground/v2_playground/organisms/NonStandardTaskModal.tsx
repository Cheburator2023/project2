import { useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

type Option = {
  value: string;
  label: string;
};

const COEFFICIENT_OPTIONS: Option[] = [
  { value: "1.00", label: "x1.00" },
  { value: "1.25", label: "x1.25" },
  { value: "1.50", label: "x1.50" },
  { value: "2.00", label: "x2.00" },
];

export type NonStandardTaskFormValues = {
  name: string;
  reason: string;
  estimateHours: string;
  coefficient: string;
  includeInCalculation: boolean;
};

type NonStandardTaskModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NonStandardTaskFormValues) => void;
  loading?: boolean;
  defaultValues?: Partial<NonStandardTaskFormValues>;
};

const INITIAL_VALUES: NonStandardTaskFormValues = {
  name: "",
  reason: "",
  estimateHours: "",
  coefficient: "",
  includeInCalculation: true,
};

export const NonStandardTaskModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  defaultValues,
}: NonStandardTaskModalProps) => {
  const [values, setValues] = useState<NonStandardTaskFormValues>({
    ...INITIAL_VALUES,
    ...defaultValues,
  });

  const total = useMemo(() => {
    const estimate = Number(values.estimateHours.replace(",", "."));
    const coefficient = Number(values.coefficient);

    if (!Number.isFinite(estimate) || !Number.isFinite(coefficient)) {
      return null;
    }

    return Math.round(estimate * coefficient);
  }, [values.estimateHours, values.coefficient]);

  const handleSubmit = () => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            Нетиповая задача
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Закрыть">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="Название"
            value={values.name}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, name: event.target.value }))
            }
          />

          <TextField
            fullWidth
            label="Причина задачи"
            value={values.reason}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, reason: event.target.value }))
            }
          />

          <TextField
            fullWidth
            label="Оценка, чд"
            value={values.estimateHours}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, estimateHours: event.target.value }))
            }
          />

          <FormControl fullWidth>
            <InputLabel>Коэффициент</InputLabel>
            <Select
              value={values.coefficient}
              label="Коэффициент"
              onChange={(event) =>
                setValues((prev) => ({ ...prev, coefficient: event.target.value }))
              }
            >
              {COEFFICIENT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ mt: 1, mb: 0.5 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" component="span" color="text.secondary">
              Итог:
            </Typography>
            <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
              {total === null ? "не рассчитано" : `${total} чд`}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch
              checked={values.includeInCalculation}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  includeInCalculation: event.target.checked,
                }))
              }
            />
            <Typography>Включить в расчет</Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <Button onClick={onClose} variant="text" color="primary" disabled={loading}>
            ОТМЕНА
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
            ПРИМЕНИТЬ
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

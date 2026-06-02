import { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

type Option = {
  value: string;
  label: string;
};

export type DataSourceFormValues = {
  name: string;
  sourceType: string;
  workType: string;
  pilotRequired: string;
  configExchange: string;
  sourceFor: string;
};

type DataSourceModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: DataSourceFormValues) => void;
  loading?: boolean;
  defaultValues?: Partial<DataSourceFormValues>;
};

const NAME_OPTIONS: Option[] = [
  { value: "crm_retail", label: "CRM Retail" },
  { value: "crm_corp", label: "CRM Corp" },
];

const SOURCE_TYPE_OPTIONS: Option[] = [
  { value: "internal", label: "Внутренний" },
  { value: "external", label: "Внешний" },
];

const WORK_TYPE_OPTIONS: Option[] = [
  { value: "development", label: "Разработка" },
  { value: "support", label: "Сопровождение" },
];

const YES_NO_OPTIONS: Option[] = [
  { value: "yes", label: "Да" },
  { value: "no", label: "Нет" },
];

const CONFIG_EXCHANGE_OPTIONS: Option[] = [
  { value: "required", label: "Требуется" },
  { value: "not_required", label: "Не требуется" },
];

const SOURCE_FOR_OPTIONS: Option[] = [
  { value: "dm_retail_scoring_features", label: "dm_retail_scoring_features" },
  { value: "dm_corp_scoring_features", label: "dm_corp_scoring_features" },
];

const INITIAL_VALUES: DataSourceFormValues = {
  name: "",
  sourceType: "",
  workType: "",
  pilotRequired: "",
  configExchange: "",
  sourceFor: "",
};

export const DataSourceModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  defaultValues,
}: DataSourceModalProps) => {
  const [values, setValues] = useState<DataSourceFormValues>({
    ...INITIAL_VALUES,
    ...defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    setValues({
      ...INITIAL_VALUES,
      ...defaultValues,
    });
  }, [open, defaultValues]);

  const setField = <K extends keyof DataSourceFormValues>(
    field: K,
    value: DataSourceFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            Источник данных
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Закрыть">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        <Stack spacing={2}>
          <SelectField
            label="Название"
            value={values.name}
            onChange={(value) => setField("name", value)}
            options={NAME_OPTIONS}
          />

          <SelectField
            label="Тип источника"
            value={values.sourceType}
            onChange={(value) => setField("sourceType", value)}
            options={SOURCE_TYPE_OPTIONS}
          />

          <SelectField
            label="Тип работ"
            value={values.workType}
            onChange={(value) => setField("workType", value)}
            options={WORK_TYPE_OPTIONS}
          />

          <SelectField
            label="Требуется пилот"
            value={values.pilotRequired}
            onChange={(value) => setField("pilotRequired", value)}
            options={YES_NO_OPTIONS}
          />

          <SelectField
            label="Обмен конф. данными"
            value={values.configExchange}
            onChange={(value) => setField("configExchange", value)}
            options={CONFIG_EXCHANGE_OPTIONS}
          />

          <SelectField
            label="Источник для"
            value={values.sourceFor}
            onChange={(value) => setField("sourceFor", value)}
            options={SOURCE_FOR_OPTIONS}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <Button onClick={onClose} color="primary" variant="text" disabled={loading}>
            ОТМЕНА
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
            ПРИМЕНИТЬ
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

const SelectField = ({ label, value, options, onChange }: SelectFieldProps) => {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

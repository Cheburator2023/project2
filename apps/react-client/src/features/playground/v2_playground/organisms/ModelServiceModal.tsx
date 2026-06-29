import { useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  ListItemText,
  MenuItem,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  SelectWithPlaceholder,
  renderSelectPlaceholderValue,
} from "@react-client/common/muiCustom/SelectWithPlaceholder";

type Option = {
  value: string;
  label: string;
};

export type ModelServiceFormValues = {
  name: string;
  channels: string[];
  pilotRequired: string;
  isCreationRequired: string;
  newServiceCreationRequired: string;
  workType: string;
};

type ModelServiceModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ModelServiceFormValues) => void;
  loading?: boolean;
  defaultValues?: Partial<ModelServiceFormValues>;
};

const CHANNEL_OPTIONS: Option[] = [
  { value: "batch", label: "Батч" },
  { value: "batch_user_upload", label: "Батч+загрузка данных потребителю" },
  { value: "batch_online", label: "Батч+Онлайн" },
  { value: "online", label: "Онлайн" },
  { value: "online_gpu", label: "Онлайн gpu" },
  { value: "llm", label: "LLM" },
  { value: "streaming", label: "Стримминг" },
];

const YES_NO_OPTIONS: Option[] = [
  { value: "yes", label: "Да" },
  { value: "no", label: "Нет" },
];

const WORK_TYPE_OPTIONS: Option[] = [
  { value: "development", label: "Разработка" },
  { value: "support", label: "Сопровождение" },
  { value: "pilot", label: "Пилот" },
];

const INITIAL_VALUES: ModelServiceFormValues = {
  name: "",
  channels: [],
  pilotRequired: "",
  isCreationRequired: "",
  newServiceCreationRequired: "",
  workType: "",
};

export const ModelServiceModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  defaultValues,
}: ModelServiceModalProps) => {
  const [values, setValues] = useState<ModelServiceFormValues>({
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

  const channelMap = useMemo(
    () => new Map(CHANNEL_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );

  const setField = <K extends keyof ModelServiceFormValues>(
    field: K,
    value: ModelServiceFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleChannelsChange = (event: SelectChangeEvent<string[]>) => {
    const nextChannels = event.target.value;
    setField("channels", Array.isArray(nextChannels) ? nextChannels : nextChannels.split(","));
  };

  const handleSubmit = () => {
    onSubmit(values);
  };

  const renderValue = (selected: string[]) => {
    if (selected.length === 0) {
      return renderSelectPlaceholderValue(selected, "Канал внедрения");
    }
    return selected.map((value) => channelMap.get(value) ?? value).join(", ");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            Модельный сервис
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Закрыть">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        <Stack spacing={2}>
          <TextField
            label="Название"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            fullWidth
          />

          <FormControl fullWidth>
            <SelectWithPlaceholder
              placeholder="Канал внедрения"
              multiple
              value={values.channels}
              onChange={handleChannelsChange}
              renderValue={renderValue}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              {CHANNEL_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={values.channels.includes(option.value)} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </SelectWithPlaceholder>
          </FormControl>

          <SelectField
            label="Требуется пилот"
            value={values.pilotRequired}
            onChange={(value) => setField("pilotRequired", value)}
            options={YES_NO_OPTIONS}
          />

          <SelectField
            label="Требуется создание ИС"
            value={values.isCreationRequired}
            onChange={(value) => setField("isCreationRequired", value)}
            options={YES_NO_OPTIONS}
          />

          <SelectField
            label="Требуется создание нового сервиса"
            value={values.newServiceCreationRequired}
            onChange={(value) => setField("newServiceCreationRequired", value)}
            options={YES_NO_OPTIONS}
          />

          <SelectField
            label="Тип работ"
            value={values.workType}
            onChange={(value) => setField("workType", value)}
            options={WORK_TYPE_OPTIONS}
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

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <FormControl fullWidth>
      <SelectWithPlaceholder
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        renderSelected={(selected) =>
          options.find((option) => option.value === selected)?.label ??
          String(selected)
        }
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </SelectWithPlaceholder>
    </FormControl>
  );
}

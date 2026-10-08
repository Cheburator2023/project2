import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { MarkdownEditor } from "@react-client/common/markdown/MarkdownEditor";
import { useEffect, useState } from "react";
import type { WidgetProps } from "@rjsf/utils";

function previewText(value: unknown): string {
	if (typeof value !== "string") return "";
	return value.replace(/\r\n/g, "\n").trim();
}

/**
 * string_markdown: поле как обычный TextField (лейбл сверху, тот же стиль);
 * клик открывает markdown-редактор в модалке. Превью — до 3 строк.
 */
export function V2MarkdownModalWidget(props: WidgetProps) {
	const {
		id,
		value,
		label,
		disabled,
		readonly,
		required,
		autofocus,
		onChange,
		onBlur,
		onFocus,
		placeholder,
		rawErrors,
		schema,
	} = props;
	const readOnly = disabled || readonly;
	const fieldTitle =
		(typeof label === "string" && label.trim()) ||
		(typeof schema?.title === "string" && schema.title) ||
		"Описание";
	const display = previewText(value);
	const emptyHint =
		(typeof placeholder === "string" && placeholder.trim()) ||
		"Нажмите, чтобы добавить описание…";

	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(display);

	useEffect(() => {
		if (open) setDraft(typeof value === "string" ? value : "");
	}, [open, value]);

	const handleOpen = () => {
		if (readOnly && !display) return;
		setOpen(true);
		onFocus?.(id, value);
	};

	const handleCancel = () => {
		setOpen(false);
		onBlur?.(id, value);
	};

	const handleSave = () => {
		onChange(draft);
		setOpen(false);
		onBlur?.(id, draft);
	};

	return (
		<>
			<TextFieldCustom
				id={id}
				label={fieldTitle}
				value={display}
				required={required}
				disabled={readOnly}
				autoFocus={autofocus}
				error={Array.isArray(rawErrors) && rawErrors.length > 0}
				placeholder={emptyHint}
				multiline
				minRows={3}
				maxRows={3}
				fullWidth
				onClick={handleOpen}
				// Значение меняется только через модалку.
				onChange={() => undefined}
				onFocus={() => onFocus?.(id, value)}
				onBlur={() => onBlur?.(id, value)}
				slotProps={{
					inputLabel: { shrink: true },
					input: {
						readOnly: true,
						endAdornment: !readOnly ? (
							<InputAdornment position="end">
								<EditOutlinedIcon
									fontSize="small"
									sx={{ color: "text.secondary", cursor: "pointer" }}
								/>
							</InputAdornment>
						) : undefined,
					},
					htmlInput: {
						title: readOnly
							? fieldTitle
							: `${fieldTitle} — нажмите для редактирования`,
						style: {
							cursor: readOnly && !display ? "default" : "pointer",
							WebkitLineClamp: 3,
							display: "-webkit-box",
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
						},
					},
				}}
				sx={{
					width: "100%",
					"& .MuiInputBase-root": {
						cursor: readOnly && !display ? "default" : "pointer",
					},
					"& .MuiInputBase-input": {
						cursor: readOnly && !display ? "default" : "pointer",
					},
				}}
			/>

			<Dialog
				open={open}
				onClose={handleCancel}
				fullWidth
				maxWidth="md"
				aria-labelledby={`${id}-md-title`}
			>
				<DialogTitle id={`${id}-md-title`}>{fieldTitle}</DialogTitle>
				<DialogContent
					dividers
					sx={{ pt: 2, overflow: "hidden", minWidth: 0 }}
				>
					<Box sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
						<MarkdownEditor
							value={draft}
							onChange={setDraft}
							disabled={readOnly}
							placeholder={emptyHint}
							height="min(480px, calc(100vh - 240px))"
						/>
					</Box>
				</DialogContent>
				<DialogActions sx={{ px: 3, py: 2 }}>
					<Button onClick={handleCancel}>
						{readOnly ? "Закрыть" : "Отменить"}
					</Button>
					{!readOnly ? (
						<Button variant="contained" onClick={handleSave}>
							Сохранить
						</Button>
					) : null}
				</DialogActions>
			</Dialog>
		</>
	);
}

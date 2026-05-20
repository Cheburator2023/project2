
import { Header } from "@react-client/features/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { routes } from "@react-client/routing/routes";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useCallback, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { V2DictionaryDetail, V2DictionaryHeaderState } from "@react-client/features/admin/organisms/V2DictionaryDetail";

type HeaderDisplay = {
	title: string;
	code: string;
	isEditing: boolean;
	savePending: boolean;
};

function headerDisplayEqual(a: HeaderDisplay | null, b: HeaderDisplay | null) {
	if (a === b) return true;
	if (!a || !b) return false;
	return (
		a.title === b.title &&
		a.code === b.code &&
		a.isEditing === b.isEditing &&
		a.savePending === b.savePending
	);
}

export function AdminV2DictionaryDetailPage() {
	const { dictionaryId } = useParams<{ dictionaryId: string }>();
	const navigate = useNavigate();
	const headerActionsRef = useRef<V2DictionaryHeaderState | null>(null);
	const [headerDisplay, setHeaderDisplay] = useState<HeaderDisplay | null>(null);

	const onHeaderChange = useCallback((state: V2DictionaryHeaderState | null) => {
		headerActionsRef.current = state;
		if (!state) {
			setHeaderDisplay(null);
			return;
		}
		const next: HeaderDisplay = {
			title: state.title,
			code: state.code,
			isEditing: state.isEditing,
			savePending: state.savePending,
		};
		setHeaderDisplay((prev) => (headerDisplayEqual(prev, next) ? prev : next));
	}, []);

	if (!dictionaryId) {
		return (
			<Flex flexDirection="column">
				<Header />
				<Typography variant="body2" sx={{ p: 2 }}>
					Не указан идентификатор справочника
				</Typography>
			</Flex>
		);
	}

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0">
			<Header
				leadingAccessory={
					headerDisplay ? (
						<Flex gap={1} alignItems="center" wrap="wrap" minWidth="0">
							<IconButton
								size="small"
								title="К списку справочников"
								onClick={() => navigate(routes.adminV2Dictionaries.rootPath)}
								aria-label="К списку справочников"
							>
								<ArrowBackIcon />
							</IconButton>
							<Typography variant="subtitle2" component="span" fontWeight={600} noWrap>
								{headerDisplay.title}
							</Typography>
							<Chip size="small" variant="outlined" label={headerDisplay.code} />
						</Flex>
					) : null
				}
			>
				{headerDisplay ? (
					<Flex gap={1} alignItems="center" wrap="wrap">
						{headerDisplay.isEditing ? (
							<>
								<Button
									size="small"
									onClick={() => headerActionsRef.current?.onCancelEdit()}
								>
									Отмена
								</Button>
								<Button
									size="small"
									variant="contained"
									disabled={headerDisplay.savePending}
									onClick={() => void headerActionsRef.current?.onSave()}
								>
									Сохранить
								</Button>
							</>
						) : (
							<Button
								size="small"
								variant="outlined"
								onClick={() => headerActionsRef.current?.onStartEdit()}
							>
								Редактировать
							</Button>
						)}
					</Flex>
				) : null}
			</Header>
			<Flex flexDirection="column" flexGrow={1} minHeight="0" sx={{ overflow: "auto" }}>
				<V2DictionaryDetail
					dictionaryId={dictionaryId}
					onHeaderChange={onHeaderChange}
				/>
			</Flex>
		</Flex>
	);
}

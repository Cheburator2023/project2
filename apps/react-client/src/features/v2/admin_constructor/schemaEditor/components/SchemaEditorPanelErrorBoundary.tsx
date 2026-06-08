import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
	children: ReactNode;
	title?: string;
};

type State = {
	error: Error | null;
};

/** Локальная граница ошибок для панелей конструктора — не роняет всю страницу. */
export class SchemaEditorPanelErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(_error: Error, _info: ErrorInfo): void {
		// Ошибка показывается пользователю в Alert ниже.
	}

	render(): ReactNode {
		const { error } = this.state;
		if (error) {
			return (
				<Alert
					severity="error"
					action={
						<Button
							size="small"
							color="inherit"
							onClick={() => this.setState({ error: null })}
						>
							Повторить
						</Button>
					}
				>
					{this.props.title ?? "Ошибка отображения панели"}: {error.message}
				</Alert>
			);
		}
		return this.props.children;
	}
}

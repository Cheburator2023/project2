/* eslint-disable react/jsx-no-constructed-context-values */
import { COEFF_IGNORED_ERROR_PREFIX } from "@react-client/common/errors/constants";
import { noop } from "lodash-es";
import {
	type Context,
	createContext,
	type ErrorInfo,
	PureComponent,
	type ReactNode,
} from "react";

type Props = {
	children: ReactNode;
	ErrorPage: any;
	ErrorUserNotFoundInRoleCard?: any;
	ErrorUserBlockedPage?: any;
	ErrorUserSessionExpired?: any;
	ErrorUserBlockedReloadPage?: any;
};

type State = {
	hasError: boolean;
	fullErrorData?: any;
	errorStack?: string;
	error?: string;
};

type TErrorContext = {
	setError: (value?: boolean) => void;
	setFullErrorData: (value?: any) => void;
};

const ErrorContext: Context<TErrorContext> = createContext({
	setError: noop,
	setFullErrorData: noop,
});

const initialState: State = {
	hasError: false,
	fullErrorData: null,
	errorStack: "",
	error: "",
};

class ErrorBoundaryComponent extends PureComponent<Props, State> {
	constructor(props: any) {
		super(props);

		this.resetErrorBoundary = this.resetErrorBoundary.bind(this);
	}

	public state: State = initialState;

	public static getDerivedStateFromError(_: Error): State {
		const ignoredErrors = [COEFF_IGNORED_ERROR_PREFIX];
		if (ignoredErrors.some((ignoredMsg) => _.message.includes(ignoredMsg))) {
			return {
				hasError: false,
				fullErrorData: null,
				errorStack: "",
				error: "",
			};
		}

		return {
			hasError: true,
			errorStack: "",
			error: "",
		};
	}

	public resetErrorBoundary(..._args: any[]) {
		const { error } = this.state;

		if (error !== null) {
			this.setState(initialState);
		}
	}

	public componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
		this.setState({
			...this.state,
			errorStack: error?.stack,
			error: `Ошибка кода приложения: ${error?.message}`,
		});
	}

	public componentDidMount(): void {
		// eventEmitter.addListener(EMITTER_EVENTS.ERROR_FULL_DATA_MODAL, ({ value }: { value: any }) => {
		//   this.setState({ ...this.state, fullErrorData: value })
		// })
	}

	public componentDidUpdate(prevProps: Readonly<Props>): void {
		// @ts-ignore
		if (prevProps?.location !== this.props.location) {
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ hasError: false });
		}
	}

	public setError(value?: boolean): void {
		this.setState({ hasError: value ?? true });
	}

	public setFullErrorData(value?: any): void {
		this.setState({ ...this.state, fullErrorData: value ?? null });
	}

	public render(): ReactNode {
		return (
			<ErrorContext.Provider
				value={{
					setError: this.setError.bind(this),
					setFullErrorData: this.setFullErrorData.bind(this),
				}}
				data-test-id="error-boundary--ErrorContext.Provider-0"
			>
				{this.state.hasError ? (
					<this.props.ErrorPage
						{...this.state}
						resetErrorBoundary={this.resetErrorBoundary}
						data-test-id="error-boundary--this.props.ErrorPage-0"
					/>
				) : (
					this.props.children
				)}
			</ErrorContext.Provider>
		);
	}
}

export const ErrorBoundary = ErrorBoundaryComponent;

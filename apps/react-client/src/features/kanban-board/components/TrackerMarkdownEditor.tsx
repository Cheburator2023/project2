import { useColorScheme } from "@mui/material/styles";
import MDEditor from "@uiw/react-md-editor";
import { getCodeString } from "rehype-rewrite";
import mermaid from "mermaid";
import {
	Fragment,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
} from "react";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

function ensureMermaidInitialized(isDark: boolean) {
	mermaid.initialize({
		startOnLoad: false,
		theme: isDark ? "dark" : "neutral",
	});
}

type MarkdownCodeProps = {
	inline?: boolean;
	children?: ReactNode | any;
	className?: string;
	node?: { children?: unknown[] };
};

function MarkdownCode({
	inline,
	children = [],
	className,
	...props
}: MarkdownCodeProps) {
	const reactId = useId();
	const diagramId = useRef(`mermaid-${reactId.replace(/:/g, "")}`);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const isMermaid =
		!inline && Boolean(className?.toLowerCase().match(/^language-mermaid/));
	const code = props.node?.children
		? getCodeString(props.node.children as Parameters<typeof getCodeString>[0])
		: String(children?.[0] ?? "");

	useEffect(() => {
		if (!container || !isMermaid || !code) return;
		let cancelled = false;
		void mermaid
			.render(diagramId.current, code)
			.then(({ svg, bindFunctions }) => {
				if (cancelled) return;
				container.innerHTML = svg;
				bindFunctions?.(container);
			})
			.catch(() => {
				if (cancelled || !container) return;
				container.textContent = code;
			});
		return () => {
			cancelled = true;
		};
	}, [container, code, isMermaid]);

	const refElement = useCallback((node: HTMLElement | null) => {
		setContainer(node);
	}, []);

	if (isMermaid) {
		return (
			<Fragment>
				<code id={diagramId.current} style={{ display: "none" }} />
				<code className={className} ref={refElement} data-name="mermaid" />
			</Fragment>
		);
	}

	if (inline) {
		return <code className={className}>{children}</code>;
	}

	return <code className={className}>{children}</code>;
}

/**
 * Глобальный `* { font-family: Inter }` ломает live-highlight MDEditor
 * (textarea и pre/code расходятся → курсор/выделение «плывут»).
 * Highlight выключен; без pre-слоя textarea absolute схлопывает родителя —
 * ниже CSS растягивает область ввода на всю высоту редактора.
 */
const EDITOR_FONT =
	'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

type Props = {
	value: string;
	onChange: (value: string) => void;
	/** Число (px) или CSS-длина, напр. `min(560px, calc(100vh - 320px))`. */
	height?: number | string;
	placeholder?: string;
	disabled?: boolean;
};

export function TrackerMarkdownEditor({
	value,
	onChange,
	height = "min(560px, max(360px, calc(100vh - 320px)))",
	placeholder = "Описание задачи в Markdown…",
	disabled = false,
}: Props) {
	const { mode } = useColorScheme();
	const isDark = mode === "dark";

	useEffect(() => {
		ensureMermaidInitialized(isDark);
	}, [isDark]);

	const shellStyle = {
		["--md-editor-font-family" as string]: EDITOR_FONT,
		height: typeof height === "number" ? `${height}px` : height,
		minHeight: 280,
		display: "flex",
		flexDirection: "column",
	} as CSSProperties;

	return (
		<div data-color-mode={isDark ? "dark" : "light"} style={shellStyle}>
			<style>{`
				.tracker-md-editor.w-md-editor {
					height: 100% !important;
					flex: 1 1 auto;
					min-height: 0;
				}
				.tracker-md-editor .w-md-editor-content {
					flex: 1 1 auto;
					min-height: 0;
					height: auto !important;
					display: flex;
					flex-direction: column;
					overflow: hidden;
				}
				.tracker-md-editor .w-md-editor-input,
				.tracker-md-editor .w-md-editor-area {
					flex: 1 1 auto;
					min-height: 0;
					height: 100% !important;
					width: 100%;
					overflow: hidden;
				}
				.tracker-md-editor .w-md-editor-text {
					height: 100% !important;
					min-height: 100% !important;
					box-sizing: border-box;
				}
				.tracker-md-editor .w-md-editor-text-pre,
				.tracker-md-editor .w-md-editor-text-pre > code,
				.tracker-md-editor .w-md-editor-text-input,
				.tracker-md-editor .w-md-editor-text-input > textarea {
					font-family: ${EDITOR_FONT} !important;
					font-size: 14px !important;
					line-height: 20px !important;
					letter-spacing: normal !important;
					word-spacing: normal !important;
					tab-size: 2 !important;
					white-space: pre-wrap !important;
				}
				.tracker-md-editor .w-md-editor-text-input {
					position: absolute !important;
					inset: 0 !important;
					top: 0 !important;
					left: 0 !important;
					width: 100% !important;
					height: 100% !important;
					overflow: auto !important;
					box-sizing: border-box !important;
					-webkit-text-fill-color: inherit !important;
				}
				.tracker-md-editor .w-md-editor-text-pre > code {
					padding: 0 !important;
					background: transparent !important;
					border: 0 !important;
				}
				.tracker-md-editor .w-md-editor-toolbar {
					padding: 6px 8px;
					gap: 2px;
				}
				.tracker-md-editor .w-md-editor-toolbar li {
					font-size: 16px;
				}
				.tracker-md-editor .w-md-editor-toolbar li > button {
					height: 28px;
					min-width: 28px;
					line-height: 18px;
					padding: 5px;
					margin: 0 2px;
					border-radius: 4px;
				}
				.tracker-md-editor .w-md-editor-toolbar li > button svg {
					width: 18px;
					height: 18px;
				}
				.tracker-md-editor .w-md-editor-toolbar-divider {
					height: 18px;
					margin: 0 4px !important;
				}
			`}</style>
			<MDEditor
				className="tracker-md-editor"
				value={value}
				onChange={(nextValue = "") => {
					if (disabled) return;
					onChange(nextValue);
				}}
				height="100%"
				preview={disabled ? "preview" : "edit"}
				hideToolbar={disabled}
				highlightEnable={false}
				visibleDragbar={false}
				textareaProps={{
					placeholder,
					disabled,
					readOnly: disabled,
					spellCheck: true,
				}}
				previewOptions={{
					components: {
						code: MarkdownCode,
					},
				}}
			/>
		</div>
	);
}

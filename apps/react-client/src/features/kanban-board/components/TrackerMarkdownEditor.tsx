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

type Props = {
	value: string;
	onChange: (value: string) => void;
	height?: number;
	placeholder?: string;
};

export function TrackerMarkdownEditor({
	value,
	onChange,
	height = 420,
	placeholder = "Описание задачи в Markdown…",
}: Props) {
	const { mode } = useColorScheme();
	const isDark = mode === "dark";

	useEffect(() => {
		ensureMermaidInitialized(isDark);
	}, [isDark]);

	return (
		<div data-color-mode={isDark ? "dark" : "light"}>
			<MDEditor
				value={value}
				onChange={(nextValue = "") => onChange(nextValue)}
				height={height}
				textareaProps={{ placeholder }}
				previewOptions={{
					components: {
						code: MarkdownCode,
					},
				}}
			/>
		</div>
	);
}

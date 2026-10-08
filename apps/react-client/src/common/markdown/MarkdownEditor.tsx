import { useColorScheme } from "@mui/material/styles";
import MDEditor, {
	type ICommand,
	type PreviewType,
} from "@uiw/react-md-editor";
import { getCodeString } from "rehype-rewrite";
import mermaid from "mermaid";
import {
	Fragment,
	memo,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type MutableRefObject,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { htmlToMarkdown } from "@react-client/common/markdown/markdownHtmlToMarkdown";
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
				<code
					className={className}
					ref={refElement}
					data-name="mermaid"
					data-mermaid-source={code}
					contentEditable={false}
				/>
			</Fragment>
		);
	}

	if (inline) {
		return <code className={className}>{children}</code>;
	}

	return <code className={className}>{children}</code>;
}

/**
 * Нельзя делать contenteditable корень ReactMarkdown: вставка добавляет
 * узлы рядом с деревом React, и текст визуально двоится до перемонтирования.
 * Правки идут в снимок HTML, который React не согласовывает.
 *
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
	/** Лимит символов (textarea + clamp при вводе). */
	maxLength?: number;
};

const FrozenMarkdownPreview = memo(function FrozenMarkdownPreview({
	source,
}: {
	source: string;
}) {
	return (
		<MDEditor.Markdown
			source={source || ""}
			style={{ padding: "12px 14px" }}
			components={{ code: MarkdownCode }}
		/>
	);
});

function tryExecWysiwyg(command: ICommand): boolean {
	const name = command.name ?? "";
	const exec = (cmd: string, value?: string) => {
		document.execCommand("styleWithCSS", false, "false");
		document.execCommand(cmd, false, value);
	};
	switch (name) {
		case "bold":
			exec("bold");
			return true;
		case "italic":
			exec("italic");
			return true;
		case "strikethrough":
			exec("strikeThrough");
			return true;
		case "hr":
			exec("insertHorizontalRule");
			return true;
		case "unordered-list":
			exec("insertUnorderedList");
			return true;
		case "ordered-list":
			exec("insertOrderedList");
			return true;
		case "checked-list":
			exec("insertUnorderedList");
			return true;
		case "quote":
			exec("formatBlock", "blockquote");
			return true;
		case "title1":
			exec("formatBlock", "h1");
			return true;
		case "title2":
			exec("formatBlock", "h2");
			return true;
		case "title3":
			exec("formatBlock", "h3");
			return true;
		case "title4":
			exec("formatBlock", "h4");
			return true;
		case "title5":
			exec("formatBlock", "h5");
			return true;
		case "title6":
			exec("formatBlock", "h6");
			return true;
		case "link": {
			const href = window.prompt("URL", "https://");
			if (href) exec("createLink", href);
			return true;
		}
		default:
			return false;
	}
}

function rangeFromPoint(x: number, y: number): Range | null {
	const doc = document as Document & {
		caretRangeFromPoint?: (x: number, y: number) => Range | null;
		caretPositionFromPoint?: (
			x: number,
			y: number,
		) => { offsetNode: Node; offset: number } | null;
	};
	if (typeof doc.caretRangeFromPoint === "function") {
		return doc.caretRangeFromPoint(x, y);
	}
	const pos = doc.caretPositionFromPoint?.(x, y);
	if (!pos) return null;
	const range = document.createRange();
	range.setStart(pos.offsetNode, pos.offset);
	range.collapse(true);
	return range;
}

function placeCaretAtEnd(el: HTMLElement) {
	const range = document.createRange();
	range.selectNodeContents(el);
	range.collapse(false);
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}

function snapshotMarkdownHtml(root: HTMLElement | null): string {
	if (!root) return "<p><br></p>";
	const html = root.innerHTML.trim();
	return html ? root.innerHTML : "<p><br></p>";
}

function insertPlainText(text: string) {
	if (!text) return;
	try {
		if (
			typeof document.execCommand === "function" &&
			document.execCommand("insertText", false, text)
		) {
			return;
		}
	} catch {
		// happy-dom и часть браузеров не реализуют execCommand.
	}

	const editable =
		document.activeElement instanceof HTMLElement &&
		document.activeElement.isContentEditable
			? document.activeElement
			: document.querySelector<HTMLElement>("[contenteditable='true']");
	if (!editable) return;

	const selection = window.getSelection();
	const range =
		selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
	if (range && selection && editable.contains(range.commonAncestorContainer)) {
		range.deleteContents();
		const node = document.createTextNode(text);
		range.insertNode(node);
		range.setStartAfter(node);
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
		return;
	}

	const block = editable.querySelector("p") ?? editable;
	block.querySelector("br")?.remove();
	block.append(text);
}

const WysiwygEditSurface = memo(
	function WysiwygEditSurface({
		initialHtml,
		placeholder,
		editRef,
		caretRef,
	}: {
		initialHtml: string;
		placeholder: string;
		editRef: MutableRefObject<HTMLDivElement | null>;
		caretRef: MutableRefObject<{ x: number; y: number } | null>;
	}) {
		useLayoutEffect(() => {
			const el = editRef.current;
			if (!el) return;
			el.focus();
			const pending = caretRef.current;
			caretRef.current = null;
			if (pending) {
				const range = rangeFromPoint(pending.x, pending.y);
				if (range && el.contains(range.startContainer)) {
					const selection = window.getSelection();
					selection?.removeAllRanges();
					selection?.addRange(range);
					return;
				}
			}
			placeCaretAtEnd(el);
		}, [caretRef, editRef]);

		return (
			<div
				ref={editRef}
				className="wmde-markdown wmde-markdown-color"
				contentEditable
				role="textbox"
				aria-label="Описание"
				spellCheck
				data-placeholder={placeholder}
				suppressContentEditableWarning
				style={{ padding: "12px 14px" }}
				dangerouslySetInnerHTML={{ __html: initialHtml }}
				onPaste={(event) => {
					event.preventDefault();
					insertPlainText(event.clipboardData?.getData("text/plain") ?? "");
				}}
			/>
		);
	},
	() => true,
);

export function MarkdownEditor({
	value,
	onChange,
	height = "min(560px, max(360px, calc(100vh - 320px)))",
	placeholder = "Описание задачи в Markdown…",
	disabled = false,
	maxLength,
}: Props) {
	const { mode } = useColorScheme();
	const isDark = mode === "dark";
	const [preview, setPreview] = useState<PreviewType>("preview");
	const [wysiwygEditing, setWysiwygEditing] = useState(false);
	const previewRootRef = useRef<HTMLDivElement | null>(null);
	const wysiwygEditRef = useRef<HTMLDivElement | null>(null);
	const wysiwygHtmlRef = useRef("<p><br></p>");
	const wysiwygEditingRef = useRef(false);
	const pendingCaretRef = useRef<{ x: number; y: number } | null>(null);
	wysiwygEditingRef.current = wysiwygEditing;

	useEffect(() => {
		ensureMermaidInitialized(isDark);
	}, [isDark]);

	useEffect(() => {
		if (!disabled) return;
		wysiwygEditingRef.current = false;
		setPreview("preview");
		setWysiwygEditing(false);
	}, [disabled]);

	const commitValue = useCallback(
		(nextValue: string) => {
			if (disabled) return;
			if (maxLength != null && nextValue.length > maxLength) {
				if (value.length > maxLength) {
					if (nextValue.length < value.length) onChange(nextValue);
					return;
				}
				onChange(nextValue.slice(0, maxLength));
				return;
			}
			onChange(nextValue);
		},
		[disabled, maxLength, onChange, value],
	);

	const commitWysiwyg = useCallback(() => {
		const root = wysiwygEditRef.current;
		if (!root) return;
		commitValue(htmlToMarkdown(root));
	}, [commitValue]);

	const startWysiwygFromPreview = useCallback(
		(caret?: { x: number; y: number }) => {
			if (disabled || wysiwygEditingRef.current) return;
			const rendered =
				previewRootRef.current?.querySelector<HTMLElement>(".wmde-markdown") ??
				null;
			wysiwygHtmlRef.current = snapshotMarkdownHtml(rendered);
			pendingCaretRef.current = caret ?? null;
			wysiwygEditingRef.current = true;
			flushSync(() => setWysiwygEditing(true));
		},
		[disabled],
	);

	useEffect(() => {
		if (wysiwygEditing || disabled) return;
		const root =
			previewRootRef.current?.querySelector<HTMLElement>(".wmde-markdown");
		if (!root) return;
		root.setAttribute("data-placeholder", placeholder);
	}, [disabled, placeholder, preview, value, wysiwygEditing]);

	const renderToolbar = useCallback(
		(
			command: ICommand,
			_libDisabled: boolean,
			executeCommand: (command: ICommand, name?: string) => void,
		) => {
			if (!command.buttonProps) return command.icon;
			const previewSwitch = command.keyCommand === "preview";
			const locked = disabled && !previewSwitch;
			return (
				<button
					type="button"
					disabled={locked}
					data-name={command.name}
					{...command.buttonProps}
					onMouseDown={(event) => {
						event.preventDefault();
					}}
					onClick={(event) => {
						event.stopPropagation();
						if (locked) return;
						if (previewSwitch && command.value) {
							flushSync(() => {
								if (wysiwygEditingRef.current) {
									commitWysiwyg();
									wysiwygEditingRef.current = false;
									setWysiwygEditing(false);
								}
								setPreview(command.value as PreviewType);
							});
							executeCommand(command);
							return;
						}
						if (preview === "preview") {
							startWysiwygFromPreview();
							wysiwygEditRef.current?.focus();
							if (tryExecWysiwyg(command)) return;
						}
						executeCommand(command);
					}}
				>
					{command.icon}
				</button>
			);
		},
		[commitWysiwyg, disabled, preview, startWysiwygFromPreview],
	);

	const onWysiwygPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (disabled || wysiwygEditingRef.current) return;
			if (event.button !== 0) return;
			event.preventDefault();
			startWysiwygFromPreview({ x: event.clientX, y: event.clientY });
		},
		[disabled, startWysiwygFromPreview],
	);

	const renderPreview = useCallback(
		(source: string) => (
			<div
				ref={previewRootRef}
				className="tracker-md-wysiwyg"
				tabIndex={disabled || wysiwygEditing ? undefined : 0}
				onPointerDown={wysiwygEditing ? undefined : onWysiwygPointerDown}
				onFocus={(event) => {
					if (disabled || wysiwygEditingRef.current) return;
					if (event.target !== event.currentTarget) return;
					startWysiwygFromPreview();
				}}
				onBlur={(event) => {
					if (disabled || !wysiwygEditingRef.current) return;
					if (previewRootRef.current?.contains(event.relatedTarget as Node)) {
						return;
					}
					flushSync(() => {
						commitWysiwyg();
						wysiwygEditingRef.current = false;
						setWysiwygEditing(false);
					});
				}}
			>
				{wysiwygEditing ? (
					<WysiwygEditSurface
						initialHtml={wysiwygHtmlRef.current}
						placeholder={placeholder}
						editRef={wysiwygEditRef}
						caretRef={pendingCaretRef}
					/>
				) : (
					<FrozenMarkdownPreview source={source} />
				)}
			</div>
		),
		[
			commitWysiwyg,
			disabled,
			onWysiwygPointerDown,
			placeholder,
			startWysiwygFromPreview,
			wysiwygEditing,
		],
	);

	const editorComponents = useMemo(
		() => ({
			toolbar: renderToolbar,
			preview: renderPreview,
		}),
		[renderPreview, renderToolbar],
	);

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
					min-width: 0;
					overflow: hidden;
				}
				.tracker-md-editor .w-md-editor-content {
					flex: 1 1 auto;
					min-height: 0;
					min-width: 0;
					height: auto !important;
					position: relative;
					/* Не даём длинной строке раздувать контейнер поверх absolute-preview. */
					overflow: hidden !important;
				}
				/* Live: библиотека — input 50% + preview absolute right 50%. Жёстко клипим input. */
				.tracker-md-editor.w-md-editor-show-live .w-md-editor-input,
				.tracker-md-editor.w-md-editor-show-live .w-md-editor-area {
					width: 50% !important;
					max-width: 50% !important;
					height: 100% !important;
					overflow: hidden !important;
					box-sizing: border-box !important;
				}
				.tracker-md-editor.w-md-editor-show-edit .w-md-editor-input,
				.tracker-md-editor.w-md-editor-show-edit .w-md-editor-area {
					width: 100% !important;
					max-width: 100% !important;
					overflow: hidden !important;
				}
				.tracker-md-editor .w-md-editor-preview {
					overflow: auto !important;
					word-break: break-word;
					overflow-wrap: anywhere;
					z-index: 2;
					background-color: var(--md-editor-background-color, #fff);
				}
				.tracker-md-editor .w-md-editor-preview .wmde-markdown,
				.tracker-md-editor .w-md-editor-preview .wmde-markdown * {
					overflow-wrap: anywhere !important;
					word-break: break-word !important;
					max-width: 100%;
				}
				.tracker-md-editor .w-md-editor-text {
					height: 100% !important;
					min-height: 100% !important;
					width: 100% !important;
					max-width: 100% !important;
					box-sizing: border-box;
					overflow-x: hidden !important;
					overflow-y: auto !important;
					/* Библиотека ставит keep-all — из‑за этого длинные латиница/цифры не ломаются. */
					word-break: break-all !important;
					overflow-wrap: anywhere !important;
					white-space: pre-wrap !important;
				}
				.tracker-md-editor .w-md-editor-text-pre,
				.tracker-md-editor .w-md-editor-text-pre > code,
				.tracker-md-editor .w-md-editor-text-input,
				.tracker-md-editor textarea.w-md-editor-text-input {
					font-family: ${EDITOR_FONT} !important;
					font-size: 14px !important;
					line-height: 20px !important;
					letter-spacing: normal !important;
					word-spacing: normal !important;
					tab-size: 2 !important;
					white-space: pre-wrap !important;
					/* break-all надёжнее break-word для <textarea> без пробелов */
					word-break: break-all !important;
					overflow-wrap: anywhere !important;
					word-wrap: break-word !important;
					max-width: 100% !important;
					box-sizing: border-box !important;
				}
				.tracker-md-editor .w-md-editor-text-input,
				.tracker-md-editor textarea.w-md-editor-text-input {
					position: absolute !important;
					inset: 0 !important;
					top: 0 !important;
					left: 0 !important;
					width: 100% !important;
					max-width: 100% !important;
					height: 100% !important;
					overflow-x: hidden !important;
					overflow-y: auto !important;
					box-sizing: border-box !important;
					-webkit-text-fill-color: inherit !important;
				}
				.tracker-md-editor .w-md-editor-text-pre {
					overflow: hidden !important;
					max-width: 100% !important;
				}
				.tracker-md-editor .w-md-editor-text-pre > code {
					padding: 0 !important;
					background: transparent !important;
					border: 0 !important;
					display: block !important;
					max-width: 100% !important;
					word-break: break-all !important;
					overflow-wrap: anywhere !important;
					white-space: pre-wrap !important;
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
				.tracker-md-wysiwyg {
					outline: none;
				}
				.tracker-md-wysiwyg .wmde-markdown {
					min-height: 240px;
					cursor: text;
					outline: none;
				}
				.tracker-md-wysiwyg .wmde-markdown[contenteditable="true"]:focus {
					box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent);
					border-radius: 4px;
				}
				.tracker-md-wysiwyg .wmde-markdown:empty::before {
					content: attr(data-placeholder);
					color: #94a3b8;
					pointer-events: none;
				}
			`}</style>
			<MDEditor
				className="tracker-md-editor"
				value={value}
				onChange={(nextValue = "") => {
					commitValue(nextValue);
				}}
				height="100%"
				preview={preview}
				hideToolbar={disabled}
				highlightEnable={false}
				visibleDragbar={false}
				components={editorComponents}
				textareaProps={{
					placeholder,
					disabled,
					readOnly: disabled,
					maxLength,
					spellCheck: true,
					// Inline fallback: часть браузеров слабо уважает word-break только из stylesheet у textarea.
					style: {
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
						overflowWrap: "anywhere",
						maxWidth: "100%",
						boxSizing: "border-box",
					},
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

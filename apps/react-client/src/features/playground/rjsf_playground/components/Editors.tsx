import MonacoEditor from "@monaco-editor/react";
import { Flex } from "@react-client/common/primitives/Flex";
import type { ErrorSchema, RJSFSchema, UiSchema } from "@rjsf/utils";
import isEqualWith from "lodash/isEqualWith";
import { useCallback, useState } from "react";

const monacoEditorOptions = {
	minimap: {
		enabled: false,
	},
	automaticLayout: true,
};

type EditorProps = {
	title: string;
	code: string;
	onChange: (data: any) => void;
};

function Editor({ title, code, onChange }: EditorProps) {
	const [valid, setValid] = useState(true);

	const onCodeChange = useCallback(
		(code: string | undefined) => {
			if (!code) {
				return;
			}

			try {
				const parsedCode = JSON.parse(code);
				setValid(true);
				onChange(parsedCode);
			} catch {
				setValid(false);
			}
		},
		[setValid, onChange],
	);

	const icon = valid ? "ok" : "remove";
	const cls = valid ? "valid" : "invalid";

	return (
		<Flex
			className="panel panel-default"
			width="auto"
			flexDirection="column"
			flexBasis={"32%"}
		>
			<Flex className="panel-heading">
				<span className={`${cls} glyphicon glyphicon-${icon}`} />
				{` ${title}`}
			</Flex>
			<MonacoEditor
				language="json"
				value={code}
				theme="vs-light"
				onChange={onCodeChange}
				height={400}
				options={monacoEditorOptions}
			/>
		</Flex>
	);
}

const toJson = (val: unknown) => JSON.stringify(val, null, 2);

type EditorsProps = {
	schema: RJSFSchema;
	setSchema: React.Dispatch<React.SetStateAction<RJSFSchema>>;
	uiSchema: UiSchema;
	setUiSchema: React.Dispatch<React.SetStateAction<UiSchema>>;
	formData: any;
	setFormData: React.Dispatch<React.SetStateAction<any>>;
	extraErrors: ErrorSchema | undefined;
	setExtraErrors: React.Dispatch<React.SetStateAction<ErrorSchema | undefined>>;
	setShareURL: React.Dispatch<React.SetStateAction<string | null>>;
	hasUiSchemaGenerator: boolean;
};

export default function Editors({
	extraErrors,
	formData,
	schema,
	uiSchema,
	setExtraErrors,
	setFormData,
	setSchema,
	setShareURL,
	setUiSchema,
	hasUiSchemaGenerator,
}: EditorsProps) {
	const onSchemaEdited = useCallback(
		(newSchema: any) => {
			setSchema(newSchema);
			setShareURL(null);
		},
		[setSchema, setShareURL],
	);

	const onUISchemaEdited = useCallback(
		(newUiSchema: any) => {
			setUiSchema(newUiSchema);
			setShareURL(null);
		},
		[setUiSchema, setShareURL],
	);

	const onFormDataEdited = useCallback(
		(newFormData: any) => {
			if (
				!isEqualWith(newFormData, formData, (newValue, oldValue) => {
					// Since this is coming from the editor which uses JSON.stringify to trim undefined values compare the values
					// using JSON.stringify to see if the trimmed formData is the same as the untrimmed state
					// Sometimes passing the trimmed value back into the Form causes the defaults to be improperly assigned
					return JSON.stringify(oldValue) === JSON.stringify(newValue);
				})
			) {
				setFormData(newFormData);
				setShareURL(null);
			}
		},
		[formData, setFormData, setShareURL],
	);

	const onExtraErrorsEdited = useCallback(
		(newExtraErrors: any) => {
			setExtraErrors(newExtraErrors);
			setShareURL(null);
		},
		[setExtraErrors, setShareURL],
	);
	const uiSchemaTitle = hasUiSchemaGenerator
		? "UISchema (regenerated on theme change)"
		: "UiSchema";

	return (
		<Flex width="100%">
			<Editor
				title="JSONSchema"
				code={toJson(schema)}
				onChange={onSchemaEdited}
			/>
			<Editor
				title={uiSchemaTitle}
				code={toJson(uiSchema)}
				onChange={onUISchemaEdited}
			/>

			<Editor
				title="formData"
				code={toJson(formData)}
				onChange={onFormDataEdited}
			/>
			{extraErrors && (
				<Editor
					title="extraErrors"
					code={toJson(extraErrors || {})}
					onChange={onExtraErrorsEdited}
				/>
			)}
		</Flex>
	);
}

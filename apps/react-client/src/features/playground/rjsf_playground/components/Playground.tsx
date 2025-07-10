import { type FormProps, type IChangeEvent, withTheme } from "@rjsf/core";
import { Theme as MuiTheme } from "@rjsf/mui";
import type {
	ErrorSchema,
	RJSFSchema,
	RJSFValidationError,
	UiSchema,
	ValidatorType,
} from "@rjsf/utils";
import { isFunction } from "lodash";
import {
	type ComponentType,
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import { samples } from "../samples";
import type { Sample, UiSchemaForTheme } from "../samples/Sample";
import base64 from "../utils/base64";
import Editors from "./Editors";
import ErrorBoundary from "./ErrorBoundary";
import GeoPosition from "./GeoPosition";
import RJSFHeader, { type LiveSettings } from "./Header";
import SpecialInput from "./SpecialInput";
import type { ThemesType } from "./ThemeSelector";

export interface PlaygroundProps {
	themes: { [themeName: string]: ThemesType };
	validators: { [validatorName: string]: ValidatorType };
}

export default function Playground({ themes, validators }: PlaygroundProps) {
	const [loaded, setLoaded] = useState(false);
	const [schema, setSchema] = useState<RJSFSchema>(
		samples.Simple.schema as RJSFSchema,
	);
	const [uiSchema, setUiSchema] = useState<UiSchema>(
		samples.Simple.uiSchema! as any,
	);
	// Store the generator inside of an object, otherwise react treats it as an initializer function
	const [uiSchemaGenerator, setUiSchemaGenerator] = useState<
		{ generator: UiSchemaForTheme } | undefined
	>(undefined);
	const [formData, setFormData] = useState<any>(samples.Simple.formData);
	const [extraErrors, setExtraErrors] = useState<ErrorSchema | undefined>();
	const [shareURL, setShareURL] = useState<string | null>(null);
	const [theme, setTheme] = useState<string>("mui");
	const [sampleName, setSampleName] = useState<string>("Simple");
	const [subtheme, setSubtheme] = useState<string | null>(null);
	const [_stylesheet, setStylesheet] = useState<string | null>(null);
	const [validator, setValidator] = useState<string>("AJV8");
	const [showForm, setShowForm] = useState(false);
	const [liveSettings, setLiveSettings] = useState<LiveSettings>({
		showErrorList: "top",
		validate: false,
		disabled: false,
		noHtml5Validate: false,
		readonly: false,
		omitExtraData: false,
		liveOmit: false,
		experimental_defaultFormStateBehavior: {
			arrayMinItems: "populate",
			emptyObjectFields: "populateAllDefaults",
		},
	});
	const [otherFormProps, setOtherFormProps] = useState<Partial<FormProps>>({});

	const playGroundFormRef = useRef<any>(null);

	const [FormComponent, setFormComponent] = useState<ComponentType<FormProps>>(
		withTheme(MuiTheme),
	);

	const onThemeSelected = useCallback(
		(theme: string, { stylesheet, theme: themeObj }: ThemesType) => {
			setTheme(theme);
			setFormComponent(withTheme(themeObj));
			setStylesheet(stylesheet);
			if (uiSchemaGenerator) {
				setUiSchema(uiSchemaGenerator.generator(theme));
			}
		},
		[uiSchemaGenerator, setTheme, setSubtheme, setFormComponent, setStylesheet],
	);

	const load = useCallback(
		(
			data: Sample & {
				theme: string;
				liveSettings: LiveSettings;
				sampleName?: string;
				validator?: string;
			},
		) => {
			const {
				schema,
				// uiSchema is missing on some examples. Provide a default to
				// clear the field in all cases.
				uiSchema = {},
				// Always reset templates and fields
				templates = {},
				fields = {},
				formData,
				theme: dataTheme = theme,
				extraErrors,
				liveSettings,
				validator: theValidator,
				sampleName,
				...rest
			} = data;

			// To support mui v6 `material-ui-5` was change to `mui` fix the load to update that as well
			const theTheme = dataTheme === "material-ui-5" ? "mui" : dataTheme;

			onThemeSelected(theTheme, themes[theTheme]);

			let theUiSchema: UiSchema;
			if (isFunction(uiSchema)) {
				theUiSchema = uiSchema(theme);
			} else {
				theUiSchema = uiSchema;
			}
			if (sampleName) {
				setSampleName(sampleName);
				const sample = samples[sampleName];
				if (isFunction(sample.uiSchema)) {
					setUiSchemaGenerator({ generator: sample.uiSchema });
				} else {
					setUiSchemaGenerator(undefined);
				}
			}

			// force resetting form component instance
			setShowForm(false);
			setSchema(schema);
			setUiSchema(theUiSchema);
			setFormData(formData);
			setExtraErrors(extraErrors);
			setShowForm(true);
			setLiveSettings(liveSettings);
			if ("validator" in data && theValidator !== undefined) {
				setValidator(theValidator);
			}
			setOtherFormProps({ fields, templates, ...rest });
		},
		[theme, onThemeSelected, themes],
	);

	const onSampleSelected = useCallback(
		(sampleName: string) => {
			load({ ...samples[sampleName], sampleName, liveSettings, theme });
		},
		[load, liveSettings, theme, samples],
	);

	useEffect(() => {
		const hash = document.location.hash.match(/#(.*)/);

		if (hash && typeof hash[1] === "string" && hash[1].length > 0 && !loaded) {
			try {
				const decoded = base64.decode(hash[1]);
				load(JSON.parse(decoded));
				setLoaded(true);
			} catch (error) {
				alert("Unable to load form setup data.");
				console.error(error);
			}

			return;
		}

		// initialize theme
		onThemeSelected(theme, themes[theme]);

		setShowForm(true);
	}, [onThemeSelected, load, loaded, setShowForm, theme, themes]);

	const onFormDataChange = useCallback(
		({ formData }: IChangeEvent, id?: string) => {
			if (id) {
				console.log("Field changed, id: ", id);
			}

			setFormData(formData);
			setShareURL(null);
		},
		[setFormData, setShareURL],
	);

	const onFormDataSubmit = useCallback(
		({ formData }: IChangeEvent, event: FormEvent<any>) => {
			console.log("submitted formData", formData);
			console.log("submit event", event);
			window.alert("Form submitted");
		},
		[],
	);

	return (
		<>
			<RJSFHeader
				schema={schema}
				uiSchema={uiSchema}
				formData={formData}
				shareURL={shareURL}
				themes={themes}
				theme={theme}
				subtheme={subtheme}
				validators={validators}
				validator={validator}
				liveSettings={liveSettings}
				sampleName={sampleName}
				playGroundFormRef={playGroundFormRef}
				onSampleSelected={onSampleSelected}
				onThemeSelected={onThemeSelected}
				setSubtheme={setSubtheme}
				setStylesheet={setStylesheet}
				setValidator={setValidator}
				setLiveSettings={setLiveSettings}
				setShareURL={setShareURL}
				data-test-id="playground--Header-0"
			/>
			<Editors
				formData={formData}
				setFormData={setFormData}
				schema={schema}
				setSchema={setSchema}
				uiSchema={uiSchema}
				setUiSchema={setUiSchema}
				extraErrors={extraErrors}
				setExtraErrors={setExtraErrors}
				setShareURL={setShareURL}
				hasUiSchemaGenerator={!!uiSchemaGenerator}
				data-test-id="playground--Editors-0"
			/>
			<div className="col-sm-5" data-test-id="playground--div-0">
				<ErrorBoundary data-test-id="playground--ErrorBoundary-0">
					{showForm && (
						<FormComponent
							{...otherFormProps}
							{...liveSettings}
							extraErrors={extraErrors}
							schema={schema}
							uiSchema={uiSchema}
							formData={formData}
							fields={{
								geo: GeoPosition,
								"/schemas/specialString": SpecialInput,
							}}
							validator={validators[validator]}
							onChange={onFormDataChange}
							onSubmit={onFormDataSubmit}
							onBlur={(id: string, value: string) =>
								console.log(`Touched ${id} with value ${value}`)
							}
							onFocus={(id: string, value: string) =>
								console.log(`Focused ${id} with value ${value}`)
							}
							onError={(errorList: RJSFValidationError[]) =>
								console.log("errors", errorList)
							}
							ref={playGroundFormRef}
							data-test-id="playground--FormComponent-0"
						/>
					)}
				</ErrorBoundary>
			</div>
		</>
	);
}

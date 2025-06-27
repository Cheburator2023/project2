import Form, { type IChangeEvent } from "@rjsf/core";
import type { RJSFSchema, UiSchema, ValidatorType } from "@rjsf/utils";
import localValidator from "@rjsf/validator-ajv8";
import {
	type ButtonHTMLAttributes,
	type Dispatch,
	type MutableRefObject,
	type PropsWithChildren,
	type SetStateAction,
	useCallback,
} from "react";
import base64 from "../utils/base64";

import { Flex } from "@react-client/common/primitives/Flex";
import CopyLink from "./CopyLink";
import RawValidatorTest from "./RawValidatorTest";
import SampleSelector, { type SampleSelectorProps } from "./SampleSelector";
import SubthemeSelector, { type SubthemeType } from "./SubthemeSelector";
import ThemeSelector, { type ThemesType } from "./ThemeSelector";
import ValidatorSelector from "./ValidatorSelector";

type HeaderButtonProps = {
	title: string;
	onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function HeaderButton({
	title,
	onClick,
	children,
	...buttonProps
}: PropsWithChildren<HeaderButtonProps>) {
	return (
		<button
			type="button"
			className="btn btn-default"
			title={title}
			onClick={onClick}
			{...buttonProps}
			data-test-id="header--button-0"
		>
			{children}
		</button>
	);
}

function HeaderButtons({
	playGroundFormRef,
}: {
	playGroundFormRef: MutableRefObject<any>;
}) {
	const submitClick = useCallback(() => {
		playGroundFormRef.current.submit();
	}, [playGroundFormRef]);
	const validateClick = useCallback(() => {
		playGroundFormRef.current.validateForm();
	}, [playGroundFormRef]);
	const resetClick = useCallback(() => {
		playGroundFormRef.current.reset();
	}, [playGroundFormRef]);
	return (
		<>
			<label className="control-label" data-test-id="header--label-0">
				Programmatic
			</label>
			<div className="btn-group" data-test-id="header--div-0">
				<HeaderButton
					title="Click me to submit the form programmatically."
					onClick={submitClick}
					data-test-id="header--HeaderButton-0"
				>
					Submit
				</HeaderButton>
				<HeaderButton
					title="Click me to validate the form programmatically."
					onClick={validateClick}
					data-test-id="header--HeaderButton-1"
				>
					Validate
				</HeaderButton>
				<HeaderButton
					title="Click me to reset the form programmatically."
					onClick={resetClick}
					data-test-id="header--HeaderButton-2"
				>
					Reset
				</HeaderButton>
			</div>
		</>
	);
}

const liveSettingsBooleanSchema: RJSFSchema = {
	type: "object",
	properties: {
		liveValidate: { type: "boolean", title: "Live validation", default: true },
		disabled: { type: "boolean", title: "Disable whole form" },
		readonly: { type: "boolean", title: "Readonly whole form" },
		omitExtraData: { type: "boolean", title: "Omit extra data" },
		liveOmit: { type: "boolean", title: "Live omit" },
		noValidate: { type: "boolean", title: "Disable validation" },
		noHtml5Validate: { type: "boolean", title: "Disable HTML 5 validation" },
		focusOnFirstError: { type: "boolean", title: "Focus on 1st Error" },
		showErrorList: {
			type: "string",
			default: "top",
			title: "Show Error List",
			enum: [false, "top", "bottom"],
		},
	},
};

const liveSettingsSelectSchema: RJSFSchema = {
	type: "object",
	properties: {
		experimental_defaultFormStateBehavior: {
			title: "Default Form State Behavior (Experimental)",
			type: "object",
			properties: {
				arrayMinItems: {
					type: "object",
					properties: {
						populate: {
							type: "string",
							default: "populate",
							title: "Populate minItems in arrays",
							oneOf: [
								{
									type: "string",
									title:
										"Populate remaining minItems with default values (legacy behavior)",
									enum: ["all"],
								},
								{
									type: "string",
									title:
										"Only populate minItems with default values when field is required",
									enum: ["requiredOnly"],
								},
								{
									type: "string",
									title: "Never populate minItems with default values",
									enum: ["never"],
								},
							],
						},
						mergeExtraDefaults: {
							title: "Merge array defaults with formData",
							type: "boolean",
							default: false,
						},
					},
				},
				allOf: {
					type: "string",
					title: "allOf defaults behaviour",
					default: "skipDefaults",
					oneOf: [
						{
							type: "string",
							title: "Populate defaults with allOf",
							enum: ["populateDefaults"],
						},
						{
							type: "string",
							title: "Skip populating defaults with allOf",
							enum: ["skipDefaults"],
						},
					],
				},
				constAsDefaults: {
					type: "string",
					title: "const as default behavior",
					default: "always",
					oneOf: [
						{
							type: "string",
							title:
								"A const value will always be merged into the form as a default",
							enum: ["always"],
						},
						{
							type: "string",
							title:
								"If const is in a `oneOf` it will NOT pick the first value as a default",
							enum: ["skipOneOf"],
						},
						{
							type: "string",
							title: "A const value will never be used as a default",
							enum: ["never"],
						},
					],
				},
				emptyObjectFields: {
					type: "string",
					title: "Object fields default behavior",
					default: "populateAllDefaults",
					oneOf: [
						{
							type: "string",
							title:
								"Assign value to formData when default is primitive, non-empty object field, or is required (legacy behavior)",
							enum: ["populateAllDefaults"],
						},
						{
							type: "string",
							title:
								"Assign value to formData when default is an object and parent is required, or default is primitive and is required",
							enum: ["populateRequiredDefaults"],
						},
						{
							type: "string",
							title: "Assign value to formData when only default is set",
							enum: ["skipEmptyDefaults"],
						},
						{
							type: "string",
							title: "Does not set defaults",
							enum: ["skipDefaults"],
						},
					],
				},
				mergeDefaultsIntoFormData: {
					type: "string",
					title: "Merge defaults into formData",
					default: "useFormDataIfPresent",
					oneOf: [
						{
							type: "string",
							title: "Use undefined field value if present",
							enum: ["useFormDataIfPresent"],
						},
						{
							type: "string",
							title: "Use default for undefined field value",
							enum: ["useDefaultIfFormDataUndefined"],
						},
					],
				},
			},
		},
	},
};

const liveSettingsBooleanUiSchema: UiSchema = {
	showErrorList: {
		"ui:widget": "radio",
		"ui:options": {
			inline: true,
		},
	},
};

const liveSettingsSelectUiSchema: UiSchema = {
	experimental_defaultFormStateBehavior: {
		"ui:options": {
			label: false,
		},
		arrayMinItems: {
			"ui:options": {
				label: false,
			},
		},
	},
};

export interface LiveSettings {
	showErrorList: false | "top" | "bottom";
	[key: string]: any;
}

type HeaderProps = {
	schema: RJSFSchema;
	uiSchema: UiSchema;
	formData: any;
	shareURL: string | null;
	themes: { [themeName: string]: ThemesType };
	theme: string;
	subtheme: string | null;
	sampleName: string;
	validators: {
		[validatorName: string]: ValidatorType<any, RJSFSchema, any>;
	};
	validator: string;
	liveSettings: LiveSettings;
	playGroundFormRef: MutableRefObject<any>;
	onSampleSelected: SampleSelectorProps["onSelected"];
	onThemeSelected: (theme: string, themeObj: ThemesType) => void;
	setSubtheme: Dispatch<SetStateAction<string | null>>;
	setStylesheet: Dispatch<SetStateAction<string | null>>;
	setValidator: Dispatch<SetStateAction<string>>;
	setLiveSettings: Dispatch<SetStateAction<LiveSettings>>;
	setShareURL: Dispatch<SetStateAction<string | null>>;
};

export default function Header({
	schema,
	uiSchema,
	formData,
	shareURL,
	themes,
	theme,
	subtheme,
	validators,
	validator,
	liveSettings,
	playGroundFormRef,
	onThemeSelected,
	setSubtheme,
	setStylesheet,
	setValidator,
	setLiveSettings,
	setShareURL,
	sampleName,
	onSampleSelected,
}: HeaderProps) {
	const onSubthemeSelected = useCallback(
		(subtheme: any, { stylesheet }: SubthemeType) => {
			setSubtheme(subtheme);
			setStylesheet(stylesheet || null);
		},
		[setSubtheme, setStylesheet],
	);

	const onValidatorSelected = useCallback(
		(validator: string) => {
			setValidator(validator);
		},
		[setValidator],
	);

	const handleSetLiveSettings = useCallback(
		({ formData }: IChangeEvent) => {
			setLiveSettings((previousLiveSettings) => ({
				...previousLiveSettings,
				...formData,
			}));
		},
		[setLiveSettings],
	);

	const onShare = useCallback(() => {
		const {
			location: { origin, pathname },
		} = document;

		try {
			const hash = base64.encode(
				JSON.stringify({
					formData,
					schema,
					uiSchema,
					theme,
					liveSettings,
					validator,
					sampleName,
				}),
			);

			setShareURL(`${origin}${pathname}#${hash}`);
		} catch (error) {
			setShareURL(null);
			console.error(error);
		}
	}, [formData, liveSettings, schema, theme, uiSchema, validator, setShareURL]);

	return (
		<div className="page-header" data-test-id="header--div-1">
			<Flex wrap="wrap" data-test-id="header--Flex-0">
				<Flex flexBasis="100%" data-test-id="header--Flex-1">
					<SampleSelector
						onSelected={onSampleSelected}
						selectedSample={sampleName}
						data-test-id="header--SampleSelector-0"
					/>
				</Flex>
				<Flex flexBasis="20%" data-test-id="header--Flex-2">
					<Form
						idPrefix="rjsf_options"
						schema={liveSettingsBooleanSchema}
						formData={liveSettings}
						validator={localValidator}
						onChange={handleSetLiveSettings}
						uiSchema={liveSettingsBooleanUiSchema}
						data-test-id="header--Form-0"
					>
						<div data-test-id="header--div-2" />
					</Form>
				</Flex>
				<Flex flexBasis="80%" data-test-id="header--Flex-3">
					<Form
						idPrefix="rjsf_options"
						schema={liveSettingsSelectSchema}
						formData={liveSettings}
						validator={localValidator}
						onChange={handleSetLiveSettings}
						uiSchema={liveSettingsSelectUiSchema}
						data-test-id="header--Form-1"
					>
						<div data-test-id="header--div-3" />
					</Form>
				</Flex>
				<Flex
					flexDirection="column"
					gap={20}
					flexBasis="20%"
					data-test-id="header--Flex-4"
				>
					<ThemeSelector
						themes={themes}
						theme={theme}
						select={onThemeSelected}
						data-test-id="header--ThemeSelector-0"
					/>
					{themes[theme]?.subthemes && (
						<SubthemeSelector
							subthemes={themes[theme].subthemes!}
							subtheme={subtheme}
							select={onSubthemeSelected}
							data-test-id="header--SubthemeSelector-0"
						/>
					)}
					<ValidatorSelector
						validators={validators}
						validator={validator}
						select={onValidatorSelected}
						data-test-id="header--ValidatorSelector-0"
					/>
					<HeaderButtons
						playGroundFormRef={playGroundFormRef}
						data-test-id="header--HeaderButtons-0"
					/>
					<div style={{ marginTop: "5px" }} data-test-id="header--div-4" />
					<CopyLink
						shareURL={shareURL}
						onShare={onShare}
						data-test-id="header--CopyLink-0"
					/>
				</Flex>
				<Flex flexBasis="80%" data-test-id="header--Flex-5">
					<RawValidatorTest
						validator={validators[validator]}
						schema={schema}
						formData={formData}
						data-test-id="header--RawValidatorTest-0"
					/>
				</Flex>
			</Flex>
		</div>
	);
}

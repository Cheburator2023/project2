import { ArrayCustomCardListsWidget } from "@react-client/common/forms/widgets/ArrayCustomCardListsWidget";
import { withTheme } from "@rjsf/core";
import { Theme as MuiTheme } from "@rjsf/mui";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useState } from "react";

const Form = withTheme(MuiTheme);

const schema: RJSFSchema = {
	type: "object",
	properties: {
		users: {
			type: "array",
			title: "Users List",
			items: {
				type: "object",
				properties: {
					id: { type: "number", title: "ID" },
					name: { type: "string", title: "Name" },
					email: { type: "string", title: "Email" },
					role: { type: "string", title: "Role" },
					active: { type: "boolean", title: "Active" },
					metadata: {
						type: "object",
						title: "Metadata",
						properties: {
							lastLogin: { type: "string", title: "Last Login" },
							preferences: { type: "object", title: "Preferences" },
						},
					},
				},
			},
		},
		products: {
			type: "array",
			title: "Products",
			items: {
				type: "object",
				properties: {
					sku: { type: "string", title: "SKU" },
					name: { type: "string", title: "Product Name" },
					price: { type: "number", title: "Price" },
					category: { type: "string", title: "Category" },
					inStock: { type: "boolean", title: "In Stock" },
				},
			},
		},
		simpleArray: {
			type: "array",
			title: "Simple Values",
			items: { type: "string" },
		},
	},
};

const uiSchema: UiSchema = {
	users: {
		"ui:widget": "ArrayCustomCardListsWidget",
		"ui:options": {
			readonly: true,
			translationMap: {
				id: "User ID",
				name: "Full Name",
				email: "Email Address",
				role: "User Role",
				active: "Account Status",
				metadata: "Additional Info",
				lastLogin: "Last Login Date",
				preferences: "User Preferences",
				theme: "UI Theme",
				language: "Language",
				notifications: "Notifications Enabled",
			},
		},
	},
	products: {
		"ui:widget": "ArrayCustomCardListsWidget",
		"ui:options": {
			translationMap: {
				sku: "Product Code",
				name: "Product Name",
				price: "Price ($)",
				category: "Category",
				inStock: "Available",
			},
		},
	},
	simpleArray: {
		"ui:widget": "ArrayCustomCardListsWidget",
		"ui:options": {
			translationMap: {},
		},
	},
};

const sampleData = {
	users: [
		{
			id: 1,
			name: "John Doe",
			email: "john.doe@example.com",
			role: "Administrator",
			active: true,
			metadata: {
				lastLogin: "2024-01-15T10:30:00Z",
				preferences: {
					theme: "dark",
					language: "en",
					notifications: true,
				},
			},
		},
		{
			id: 2,
			name: "Jane Smith",
			email: "jane.smith@example.com",
			role: "User",
			active: false,
			metadata: {
				lastLogin: "2024-01-10T14:20:00Z",
				preferences: {
					theme: "light",
					language: "es",
					notifications: false,
				},
			},
		},
	],
	products: [
		{
			sku: "LAPTOP-001",
			name: "Gaming Laptop",
			price: 1299.99,
			category: "Electronics",
			inStock: true,
		},
		{
			sku: "MOUSE-002",
			name: "Wireless Mouse",
			price: 29.99,
			category: "Accessories",
			inStock: false,
		},
	],
	simpleArray: ["Apple", "Banana", "Cherry", "Date"],
};

const widgets = {
	ArrayCustomCardListsWidget,
};

export const ArrayCustomCardListsWidgetExample = () => {
	const [formData, setFormData] = useState(sampleData);

	return (
		<Form
			schema={schema}
			uiSchema={uiSchema}
			formData={formData}
			widgets={widgets}
			validator={validator}
			onChange={({ formData: newFormData }) => setFormData(newFormData)}
			onSubmit={({ formData: submittedData }) => {
				console.log("Form submitted:", submittedData);
			}}
		/>
	);
};

export const MultiLanguageExample = () => {
	const [language, setLanguage] = useState<"en" | "es" | "ru">("en");

	const translationMaps = {
		en: {
			id: "ID",
			name: "Name",
			email: "Email",
			role: "Role",
			active: "Active",
		},
		es: {
			id: "ID",
			name: "Nombre",
			email: "Correo",
			role: "Rol",
			active: "Activo",
		},
		ru: {
			id: "ID",
			name: "Имя",
			email: "Почта",
			role: "Роль",
			active: "Активен",
		},
	};

	const mockProps = {
		value: sampleData.users,
		label: "Users",
		readonly: false,
		id: "users-widget",
		schema: schema.properties?.users as any,
		uiSchema: {},
		formData: sampleData.users,
		onChange: () => {},
		onBlur: () => {},
		onFocus: () => {},
		registry: {} as any,
		required: false,
		disabled: false,
		autofocus: false,
		placeholder: "",
		rawErrors: [],
		options: {
			translationMap: translationMaps[language],
		},
	};

	return (
		<div>
			<div style={{ marginBottom: "16px" }}>
				<button onClick={() => setLanguage("en")}>English</button>
				<button onClick={() => setLanguage("es")}>Español</button>
				<button onClick={() => setLanguage("ru")}>Русский</button>
			</div>
			<ArrayCustomCardListsWidget {...(mockProps as any)} />
		</div>
	);
};

/**
 * Generates an object conforming to a JSON schema.
 *
 * @param {object} schema - The JSON schema to generate the object from.
 * @param {number} numEntities - The number of entities to generate if the schema is an array. Defaults to 1.
 * @returns {object|array} - The generated object or array of objects.
 * @throws {Error} - If the schema is invalid or generation fails.
 */
export function generateObjectFromSchema(schema: any, numEntities = 1): any {
	if (!schema || typeof schema !== "object") {
		throw new Error("Invalid schema: Schema must be a non-null object.");
	}

	if (schema.type === "array") {
		const generatedArray = [];
		for (let i = 0; i < numEntities; i++) {
			if (schema.items) {
				generatedArray.push(generateObjectFromSchema(schema.items)); // Recursive call for array items
			} else {
				generatedArray.push(null); // Or a default object, depending on your needs
			}
		}
		return generatedArray;
	}
	if (schema.type === "object") {
		const generatedObject: any = {};

		if (schema.properties) {
			for (const propertyName in schema.properties) {
				if (Object.hasOwn(schema.properties, propertyName)) {
					const propertySchema = schema.properties[propertyName];

					if (propertySchema.type === "string") {
						generatedObject[propertyName] = "string value"; // Replace with a more meaningful string
					} else if (propertySchema.type === "number") {
						generatedObject[propertyName] = 0; // Replace with a more meaningful number
					} else if (propertySchema.type === "integer") {
						generatedObject[propertyName] = 0;
					} else if (propertySchema.type === "boolean") {
						generatedObject[propertyName] = false;
					} else if (propertySchema.type === "array") {
						generatedObject[propertyName] = []; // Initialize as an empty array
						if (propertySchema.items) {
							generatedObject[propertyName] = generateObjectFromSchema(
								propertySchema,
								numEntities,
							); // Recursive call for array items
						}
					} else if (propertySchema.type === "object") {
						generatedObject[propertyName] =
							generateObjectFromSchema(propertySchema); // Recursive call for nested objects
					} else {
						generatedObject[propertyName] = null; // Default value for unknown types
					}
				}
			}
		}

		return generatedObject;
	}
	// Handle primitive types directly if the schema itself is not an object or array
	if (schema.type === "string") return "string value";
	if (schema.type === "number") return 0;
	if (schema.type === "integer") return 0;
	if (schema.type === "boolean") return false;
	return null; // Default for unknown or unsupported types
}

/** @typedef {{ source: string; path: string; name: string; }} InputFile*/

const fs = require("fs");
const path = require("path");
const jscodeshift = require("jscodeshift");

/**
 * Gets the name of a JSX element as a string, handling simple names (`div`),
 * custom components (`MyComponent`), and member expressions (`MUI.Button`).
 * @param {typeof import("jscodeshift")} j
 * @param {import('jscodeshift').ASTNode} nameNode - The name node from a JSXOpeningElement.
 * @returns {string}
 */
const getElementName = (j, nameNode) => {
	return j(nameNode).toSource();
};

/**
 * @param {InputFile} file
 * @param {typeof import("jscodeshift")} j
 * @param {string} testAttribute - default value "data-test-id"
 * */
function addTestIds(file, j, testAttribute = "data-test-id") {
	const testIdExists = (openingElement) =>
		openingElement.attributes.some(
			(attribute) =>
				attribute.type === "JSXAttribute" &&
				attribute.name.name === testAttribute,
		);

	const existingTestIDs = j(file.source)
		.find(j.JSXAttribute)
		.nodes()
		.filter((node) => node.name.name === testAttribute)
		.map((node) =>
			node.value.type === "StringLiteral" ? node.value.value : null,
		)
		.filter(Boolean);

	const memo = {};
	/** @type {function(el: import('jscodeshift').JSXOpeningElement): string}*/
	const testIdName = (el) => {
		const elementName = getElementName(j, el.name);
		const baseName = `${file.name}__${elementName}_`;

		if (memo[baseName] === undefined) {
			memo[baseName] = 0;
		} else {
			memo[baseName]++;
		}

		const newName = baseName + memo[baseName];
		// If the generated name already exists (unlikely but possible), recurse to get the next index.
		return existingTestIDs.includes(newName) ? testIdName(el) : newName;
	};

	/** @type {import("jscodeshift").Collection} Collection */
	const jsxElements = j(file.source).find(j.JSXElement);

	return jsxElements
		.forEach((p) => {
			const openingElement = p.node.openingElement;
			// We no longer filter by tag type. Apply to all elements.
			// only add the attribute if it does not already exist
			if (!testIdExists(openingElement)) {
				j(p).replaceWith(
					j.jsxElement(
						j.jsxOpeningElement(
							// Use the original name node, which handles identifiers and member expressions
							openingElement.name,
							openingElement.attributes.concat(
								j.jsxAttribute(
									j.jsxIdentifier(testAttribute),
									j.literal(testIdName(openingElement)),
								),
							),
							openingElement.selfClosing,
						),
						p.node.closingElement,
						p.node.children,
					),
				);
			}
		})
		.toSource({ lineTerminator: "\n", trailingComma: true });
}

// Unused constants have been removed (HTML_TAGS, MY_TAGS, MUI_TAGS)

const CUSTOM_IO_FOLDER = process.argv
	.find((s) => s.includes("io-dir="))
	?.split("io-dir=")[1];

const customAttribute = process.argv
	.find((s) => s.includes("customAttribute="))
	?.split("customAttribute=")[1];

// Unused argument flags have been removed (--all, --mui)

const INPUT_FOLDER = path.join(__dirname, CUSTOM_IO_FOLDER || "input");
const OUTPUT_FOLDER = path.join(__dirname, CUSTOM_IO_FOLDER || "output");

const reactFileNaming = /[-_.a-zA-Z]*\.(tsx|jsx)$/;
const testFileNaming = /[-_.a-zA-Z]*\.test\.(tsx|jsx)$/;
const reactExtension = /\.(tsx|jsx)/;
const capitalLetters = /[A-Z]/g;
const htmlSymbolNumber = /&#\d{1,10};/g;
const htmlSymbolEntity = /&[a-z]{1,10};/g;

/* HACK !
 * jscodeshift removes html entities such as     etc.,
 *  this solution escapes those symbols, then converts them back
 */
const registeredSymbols = [];
const toSafeChar = (symbol) => {
	const escaped = escape(symbol);
	// @ts-ignore
	registeredSymbols.push(escaped);
	return escaped;
};

const escapeSymbol = (str) =>
	str
		.replace(htmlSymbolEntity, toSafeChar)
		.replace(htmlSymbolNumber, toSafeChar);

const unescapeSymbol = (str) =>
	registeredSymbols.reduce((result, symbol) => {
		return result.replace(symbol, unescape(symbol));
	}, str);

const writeFile = (filePath, source) => {
	const folderPath = filePath.replace(reactFileNaming, "");

	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, { recursive: true });
	}
	fs.writeFileSync(filePath, source, { encoding: "utf-8" });
};

/**
 * @param {string} inputFilePath
 * @return {void}
 * */
const transform = (inputFilePath) => {
	const capitalToMiddleScore = (a, idx) => {
		return `${idx ? "-" : ""}${a.toLowerCase()}`;
	};

	const kebabCaseName = inputFilePath
		.match(reactFileNaming)[0]
		.replace(reactExtension, "")
		.replace(capitalLetters, capitalToMiddleScore);

	/** @type {InputFile} */
	const file = {
		source: escapeSymbol(fs.readFileSync(inputFilePath, { encoding: "utf-8" })),
		path: inputFilePath,
		name: kebabCaseName,
	};

	// The tagList is no longer needed.

	/** @type {string} */
	const outputSource = addTestIds(
		file,
		jscodeshift.withParser("tsx"),
		customAttribute,
	);
	const outputFilePath = inputFilePath.replace(INPUT_FOLDER, OUTPUT_FOLDER);

	writeFile(outputFilePath, unescapeSymbol(outputSource));
};

const isFolder = (dir) => fs.lstatSync(dir).isDirectory();
const isReactFile = (dir) => {
	return (
		fs.lstatSync(dir).isFile() &&
		reactFileNaming.test(dir) &&
		!testFileNaming.test(dir)
	);
};

/**
 * @param {string[]} dirs
 * @param {string} parentDir
 * @return {string[]} */
const toAbsolute = (dirs, parentDir = INPUT_FOLDER) => {
	return dirs.map((dir) => path.join(parentDir, dir));
};

const stack = toAbsolute(fs.readdirSync(INPUT_FOLDER));

while (stack.length) {
	const curDir = stack.pop();
	if (isFolder(curDir)) {
		const folders = toAbsolute(fs.readdirSync(curDir), curDir);
		stack.push(...folders);
	}
	if (isReactFile(curDir)) {
		try {
			transform(curDir);
		} catch (e) {
			console.error(`Could not transform ${curDir}:`, e);
		}
	}
}

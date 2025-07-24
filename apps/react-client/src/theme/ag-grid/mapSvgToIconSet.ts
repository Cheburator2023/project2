import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename } from "path";

const ICONS_DIR = "./quartz-icons";
const OUTPUT_FILE = "./agGridIconSet.tsx";

function toCamelCase(str: string): string {
	return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function generateIconVariableName(filename: string): string {
	const baseName = basename(filename, ".svg");
	const camelCase = toCamelCase(baseName);
	return camelCase + "Icon";
}

interface SvgMap {
	[key: string]: string;
}

function readSvgFiles(): SvgMap {
	const svgFiles = readdirSync(ICONS_DIR)
		.filter((file) => file.endsWith(".svg"))
		.sort();

	const svgMap: SvgMap = {};

	svgFiles.forEach((file) => {
		const filePath = join(ICONS_DIR, file);
		const content = readFileSync(filePath, "utf8").trim();
		const varName = generateIconVariableName(file);
		svgMap[varName] = content;
	});

	return svgMap;
}

function generateIconSetFile(svgMap: SvgMap): string {
	const iconVariables = Object.entries(svgMap)
		.map(([varName, svgContent]) => `const ${varName} = \`${svgContent}\`;`)
		.join("\n");

	const iconSetContent = `${iconVariables}

export const agGridIconSet = {
	// Column group icons
	columnGroupOpened: expandedIcon,
	columnGroupClosed: contractedIcon,

	// Column tool panel icons
	columnSelectClosed: treeClosedIcon,
	columnSelectOpen: treeOpenIcon,
	columnSelectIndeterminate: treeIndeterminateIcon,

	// Accordion icons
	accordionOpen: treeOpenIcon,
	accordionClosed: treeClosedIcon,
	accordionIndeterminate: treeIndeterminateIcon,

	// Column move icons
	columnMovePin: pinIcon,
	columnMoveHide: eyeSlashIcon,
	columnMoveMove: arrowsIcon,
	columnMoveLeft: leftIcon,
	columnMoveRight: rightIcon,
	columnMoveGroup: groupIcon,
	columnMoveValue: aggregationIcon,
	columnMovePivot: pivotIcon,

	// Drop zone icons
	dropNotAllowed: notAllowedIcon,

	// Row group icons
	groupContracted: treeClosedIcon,
	groupExpanded: treeOpenIcon,

	// Set filter icons
	setFilterGroupClosed: treeClosedIcon,
	setFilterGroupOpen: treeOpenIcon,
	setFilterGroupIndeterminate: treeIndeterminateIcon,
	setFilterLoading: loadingIcon,

	// General UI icons
	chart: chartIcon,
	close: crossIcon,
	cancel: cancelIcon,
	check: tickIcon,

	// Pagination icons
	first: firstIcon,
	previous: previousIcon,
	next: nextIcon,
	last: lastIcon,

	// Chart linking icons
	linked: linkedIcon,
	unlinked: unlinkedIcon,

	// Loading icon
	groupLoading: loadingIcon,

	// Menu icons
	menu: menuIcon,
	menuAlt: menuIcon,
	legacyMenu: menuIcon,

	// Filter icons
	filter: filterIcon,
	filterActive: filterIcon,
	filterAdd: plusIcon,
	filterCardCollapse: smallUpIcon,
	filterCardExpand: smallDownIcon,
	filterCardEditing: crossIcon,
	filterTab: filterIcon,
	filtersToolPanel: filterIcon,

	// Column icons
	columns: columnsIcon,
	columnsToolPanel: columnsIcon,

	// Window control icons
	maximize: maximizeIcon,
	minimize: minimizeIcon,

	// Menu items
	menuPin: pinIcon,
	menuValue: aggregationIcon,
	menuAddRowGroup: groupIcon,
	menuRemoveRowGroup: groupIcon,

	// Clipboard icons
	clipboardCopy: copyIcon,
	clipboardCut: cutIcon,
	clipboardPaste: pasteIcon,

	// Panel icons
	pivotPanel: pivotIcon,
	rowGroupPanel: groupIcon,
	valuePanel: aggregationIcon,

	// Drag icons
	columnDrag: gripIcon,
	rowDrag: gripIcon,

	// Export icons
	save: saveIcon,
	csvExport: csvIcon,
	excelExport: excelIcon,

	// Select icons
	selectOpen: smallDownIcon,
	richSelectOpen: smallDownIcon,
	richSelectRemove: cancelIcon,

	// Sub menu icons
	subMenuOpen: smallRightIcon,
	subMenuOpenRtl: smallLeftIcon,
	panelDelimiter: smallRightIcon,
	panelDelimiterRtl: smallLeftIcon,

	// Sort icons
	sortAscending: ascIcon,
	sortDescending: descIcon,
	sortUnSort: noneIcon,

	// Advanced Filter icons
	advancedFilterBuilder: groupIcon,
	advancedFilterBuilderDrag: gripIcon,
	advancedFilterBuilderDragHandle: menuIcon,
	advancedFilterBuilderInvalid: notAllowedIcon,
	advancedFilterBuilderMoveUp: upIcon,
	advancedFilterBuilderMoveDown: downIcon,
	advancedFilterBuilderAdd: plusIcon,
	advancedFilterBuilderRemove: minusIcon,
	advancedFilterBuilderSelect: smallDownIcon,

	// Charts icons
	chartsMenu: menuIcon,
	chartsMenuEdit: chartIcon,
	chartsMenuAdvancedSettings: menuIcon,
	chartsMenuAdd: plusIcon,
	chartsColorPicker: smallDownIcon,
	chartsThemePrevious: previousIcon,
	chartsThemeNext: nextIcon,
	chartsDownload: saveIcon,
};
`;

	return iconSetContent;
}

function main(): void {
	try {
		console.log("Reading SVG files from:", ICONS_DIR);
		const svgMap = readSvgFiles();

		console.log("Found", Object.keys(svgMap).length, "SVG files");
		console.log("Generated variables:", Object.keys(svgMap).join(", "));

		const iconSetContent = generateIconSetFile(svgMap);

		writeFileSync(OUTPUT_FILE, iconSetContent);
		console.log("Generated", OUTPUT_FILE);

		console.log("\nSVG to Variable mapping:");
		Object.entries(svgMap).forEach(([varName, _]) => {
			const filename =
				varName
					.replace(/Icon$/, "")
					.replace(/([A-Z])/g, "-$1")
					.toLowerCase()
					.substring(1) + ".svg";
			console.log(`  ${filename} -> ${varName}`);
		});
	} catch (error) {
		console.error("Error:", (error as Error).message);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

export {
	readSvgFiles,
	generateIconSetFile,
	toCamelCase,
	generateIconVariableName,
};

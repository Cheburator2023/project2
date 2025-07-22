import aggregationIcon from "./quartz-icons/aggregation.svg?raw";
import arrowsIcon from "./quartz-icons/arrows.svg?raw";
import ascIcon from "./quartz-icons/asc.svg?raw";
import cancelIcon from "./quartz-icons/cancel.svg?raw";
import chartIcon from "./quartz-icons/chart.svg?raw";
import checkboxCheckedIcon from "./quartz-icons/checkbox-checked.svg?raw";
import checkboxIndeterminateIcon from "./quartz-icons/checkbox-indeterminate.svg?raw";
import checkboxUncheckedIcon from "./quartz-icons/checkbox-unchecked.svg?raw";
import colorPickerIcon from "./quartz-icons/color-picker.svg?raw";
import columnsIcon from "./quartz-icons/columns.svg?raw";
import contractedIcon from "./quartz-icons/contracted.svg?raw";
import copyIcon from "./quartz-icons/copy.svg?raw";
import crossIcon from "./quartz-icons/cross.svg?raw";
import csvIcon from "./quartz-icons/csv.svg?raw";
import cutIcon from "./quartz-icons/cut.svg?raw";
import descIcon from "./quartz-icons/desc.svg?raw";
import downIcon from "./quartz-icons/down.svg?raw";
import excelIcon from "./quartz-icons/excel.svg?raw";
import expandedIcon from "./quartz-icons/expanded.svg?raw";
import eyeSlashIcon from "./quartz-icons/eye-slash.svg?raw";
import eyeIcon from "./quartz-icons/eye.svg?raw";
import filterIcon from "./quartz-icons/filter.svg?raw";
import firstIcon from "./quartz-icons/first.svg?raw";
import gripIcon from "./quartz-icons/grip.svg?raw";
import groupIcon from "./quartz-icons/group.svg?raw";
import lastIcon from "./quartz-icons/last.svg?raw";
import leftIcon from "./quartz-icons/left.svg?raw";
import linkedIcon from "./quartz-icons/linked.svg?raw";
import loadingIcon from "./quartz-icons/loading.svg?raw";
import maximizeIcon from "./quartz-icons/maximize.svg?raw";
import menuIcon from "./quartz-icons/menu.svg?raw";
import minimizeIcon from "./quartz-icons/minimize.svg?raw";
import minusIcon from "./quartz-icons/minus.svg?raw";
import nextIcon from "./quartz-icons/next.svg?raw";
import noneIcon from "./quartz-icons/none.svg?raw";
import notAllowedIcon from "./quartz-icons/not-allowed.svg?raw";
import pasteIcon from "./quartz-icons/paste.svg?raw";
import pinIcon from "./quartz-icons/pin.svg?raw";
import pivotIcon from "./quartz-icons/pivot.svg?raw";
import plusIcon from "./quartz-icons/plus.svg?raw";
import previousIcon from "./quartz-icons/previous.svg?raw";
import radioButtonOffIcon from "./quartz-icons/radio-button-off.svg?raw";
import radioButtonOnIcon from "./quartz-icons/radio-button-on.svg?raw";
import rightIcon from "./quartz-icons/right.svg?raw";
import saveIcon from "./quartz-icons/save.svg?raw";
import smallDownIcon from "./quartz-icons/small-down.svg?raw";
import smallLeftIcon from "./quartz-icons/small-left.svg?raw";
import smallRightIcon from "./quartz-icons/small-right.svg?raw";
import smallUpIcon from "./quartz-icons/small-up.svg?raw";
import tickIcon from "./quartz-icons/tick.svg?raw";
import treeClosedIcon from "./quartz-icons/tree-closed.svg?raw";
import treeIndeterminateIcon from "./quartz-icons/tree-indeterminate.svg?raw";
import treeOpenIcon from "./quartz-icons/tree-open.svg?raw";
import unlinkedIcon from "./quartz-icons/unlinked.svg?raw";
import upIcon from "./quartz-icons/up.svg?raw";

const createSvgElement = (svgString: string): HTMLElement => {
	const div = document.createElement("div");
	div.innerHTML = svgString;
	return div.firstElementChild as HTMLElement;
};

export const agGridIconSet = {
	// Column group icons
	columnGroupOpened: () => createSvgElement(expandedIcon),
	columnGroupClosed: () => createSvgElement(contractedIcon),

	// Column tool panel icons
	columnSelectClosed: () => createSvgElement(treeClosedIcon),
	columnSelectOpen: () => createSvgElement(treeOpenIcon),
	columnSelectIndeterminate: () => createSvgElement(treeIndeterminateIcon),

	// Accordion icons
	accordionOpen: () => createSvgElement(treeOpenIcon),
	accordionClosed: () => createSvgElement(treeClosedIcon),
	accordionIndeterminate: () => createSvgElement(treeIndeterminateIcon),

	// Column move icons
	columnMovePin: () => createSvgElement(pinIcon),
	columnMoveHide: () => createSvgElement(eyeSlashIcon),
	columnMoveMove: () => createSvgElement(arrowsIcon),
	columnMoveLeft: () => createSvgElement(leftIcon),
	columnMoveRight: () => createSvgElement(rightIcon),
	columnMoveGroup: () => createSvgElement(groupIcon),
	columnMoveValue: () => createSvgElement(aggregationIcon),
	columnMovePivot: () => createSvgElement(pivotIcon),

	// Drop zone icons
	dropNotAllowed: () => createSvgElement(notAllowedIcon),

	// Row group icons
	groupContracted: () => createSvgElement(treeClosedIcon),
	groupExpanded: () => createSvgElement(treeOpenIcon),

	// Set filter icons
	setFilterGroupClosed: () => createSvgElement(treeClosedIcon),
	setFilterGroupOpen: () => createSvgElement(treeOpenIcon),
	setFilterGroupIndeterminate: () => createSvgElement(treeIndeterminateIcon),
	setFilterLoading: () => createSvgElement(loadingIcon),

	// General UI icons
	chart: () => createSvgElement(chartIcon),
	close: () => createSvgElement(crossIcon),
	cancel: () => createSvgElement(cancelIcon),
	check: () => createSvgElement(tickIcon),

	// Pagination icons
	first: () => createSvgElement(firstIcon),
	previous: () => createSvgElement(previousIcon),
	next: () => createSvgElement(nextIcon),
	last: () => createSvgElement(lastIcon),

	// Chart linking icons
	linked: () => createSvgElement(linkedIcon),
	unlinked: () => createSvgElement(unlinkedIcon),

	// Loading icon
	groupLoading: () => createSvgElement(loadingIcon),

	// Menu icons
	menu: () => createSvgElement(menuIcon),
	menuAlt: () => createSvgElement(menuIcon),
	legacyMenu: () => createSvgElement(menuIcon),

	// Filter icons
	filter: () => createSvgElement(filterIcon),
	filterActive: () => createSvgElement(filterIcon),
	filterAdd: () => createSvgElement(plusIcon),
	filterCardCollapse: () => createSvgElement(smallUpIcon),
	filterCardExpand: () => createSvgElement(smallDownIcon),
	filterCardEditing: () => createSvgElement(crossIcon),
	filterTab: () => createSvgElement(filterIcon),
	filtersToolPanel: () => createSvgElement(filterIcon),

	// Column icons
	columns: () => createSvgElement(columnsIcon),
	columnsToolPanel: () => createSvgElement(columnsIcon),

	// Window control icons
	maximize: () => createSvgElement(maximizeIcon),
	minimize: () => createSvgElement(minimizeIcon),

	// Menu items
	menuPin: () => createSvgElement(pinIcon),
	menuValue: () => createSvgElement(aggregationIcon),
	menuAddRowGroup: () => createSvgElement(groupIcon),
	menuRemoveRowGroup: () => createSvgElement(groupIcon),

	// Clipboard icons
	clipboardCopy: () => createSvgElement(copyIcon),
	clipboardCut: () => createSvgElement(cutIcon),
	clipboardPaste: () => createSvgElement(pasteIcon),

	// Panel icons
	pivotPanel: () => createSvgElement(pivotIcon),
	rowGroupPanel: () => createSvgElement(groupIcon),
	valuePanel: () => createSvgElement(aggregationIcon),

	// Drag icons
	columnDrag: () => createSvgElement(gripIcon),
	rowDrag: () => createSvgElement(gripIcon),

	// Export icons
	save: () => createSvgElement(saveIcon),
	csvExport: () => createSvgElement(csvIcon),
	excelExport: () => createSvgElement(excelIcon),

	// Select icons
	selectOpen: () => createSvgElement(smallDownIcon),
	richSelectOpen: () => createSvgElement(smallDownIcon),
	richSelectRemove: () => createSvgElement(cancelIcon),

	// Sub menu icons
	subMenuOpen: () => createSvgElement(smallRightIcon),
	subMenuOpenRtl: () => createSvgElement(smallLeftIcon),
	panelDelimiter: () => createSvgElement(smallRightIcon),
	panelDelimiterRtl: () => createSvgElement(smallLeftIcon),

	// Sort icons
	sortAscending: () => createSvgElement(ascIcon),
	sortDescending: () => createSvgElement(descIcon),
	sortUnSort: () => createSvgElement(noneIcon),

	// Advanced Filter icons
	advancedFilterBuilder: () => createSvgElement(groupIcon),
	advancedFilterBuilderDrag: () => createSvgElement(gripIcon),
	advancedFilterBuilderDragHandle: () => createSvgElement(menuIcon),
	advancedFilterBuilderInvalid: () => createSvgElement(notAllowedIcon),
	advancedFilterBuilderMoveUp: () => createSvgElement(upIcon),
	advancedFilterBuilderMoveDown: () => createSvgElement(downIcon),
	advancedFilterBuilderAdd: () => createSvgElement(plusIcon),
	advancedFilterBuilderRemove: () => createSvgElement(minusIcon),
	advancedFilterBuilderSelect: () => createSvgElement(smallDownIcon),

	// Charts icons
	chartsMenu: () => createSvgElement(menuIcon),
	chartsMenuEdit: () => createSvgElement(chartIcon),
	chartsMenuAdvancedSettings: () => createSvgElement(menuIcon),
	chartsMenuAdd: () => createSvgElement(plusIcon),
	chartsColorPicker: () => createSvgElement(smallDownIcon),
	chartsThemePrevious: () => createSvgElement(previousIcon),
	chartsThemeNext: () => createSvgElement(nextIcon),
	chartsDownload: () => createSvgElement(saveIcon),
};

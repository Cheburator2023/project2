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

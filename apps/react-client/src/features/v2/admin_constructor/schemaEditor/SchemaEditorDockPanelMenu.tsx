import CheckIcon from "@mui/icons-material/Check";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import { useCallback, useState, type MouseEvent } from "react";

import { V2_TEMPLATE_EDIT_TEST_IDS } from "../testIds";
import { DOCK_PANEL_HEADINGS } from "./constants";
import { useSchemaEditorDock } from "./SchemaEditorDockContext";
import type { SchemaEditorMainTab } from "./types";

export function SchemaEditorDockPanelMenu() {
	const { activateMainTab, getOpenPanelIds } = useSchemaEditorDock();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [openPanelIds, setOpenPanelIds] = useState<Set<SchemaEditorMainTab>>(
		() => new Set(),
	);

	const openMenu = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			event.stopPropagation();
			setOpenPanelIds(new Set(getOpenPanelIds()));
			setAnchorEl(event.currentTarget);
		},
		[getOpenPanelIds],
	);

	const closeMenu = useCallback(() => {
		setAnchorEl(null);
	}, []);

	const onSelectPanel = useCallback(
		(panelId: SchemaEditorMainTab) => {
			activateMainTab(panelId);
			closeMenu();
		},
		[activateMainTab, closeMenu],
	);

	return (
		<>
			<IconButton
				size="small"
				title="Показать панель"
				aria-label="Показать панель"
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.dockPanelMenu}
				onClick={openMenu}
				onMouseDown={(event) => event.stopPropagation()}
				sx={{ p: 0.35, color: "text.secondary" }}
			>
				<ViewColumnIcon sx={{ fontSize: 18 }} />
			</IconButton>
			<Menu
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={closeMenu}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
			>
				<MenuList
					dense
					disablePadding
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.dockPanelMenuList}
				>
					{DOCK_PANEL_HEADINGS.map(([panelId, title]) => {
						const isOpen = openPanelIds.has(panelId);
						return (
							<MenuItem
								key={panelId}
								data-test-id={`${V2_TEMPLATE_EDIT_TEST_IDS.dockPanelMenuItem}-${panelId}`}
								onClick={() => onSelectPanel(panelId)}
							>
								<ListItemIcon sx={{ minWidth: 28 }}>
									{isOpen ? (
										<CheckIcon fontSize="small" color="primary" />
									) : null}
								</ListItemIcon>
								<ListItemText
									primary={title}
									secondary={isOpen ? undefined : "Скрыта — будет добавлена"}
									secondaryTypographyProps={{ variant: "caption" }}
								/>
							</MenuItem>
						);
					})}
				</MenuList>
			</Menu>
		</>
	);
}

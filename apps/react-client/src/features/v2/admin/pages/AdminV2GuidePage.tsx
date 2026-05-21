import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import {
	CALCULATOR_GUIDE_INTRO,
	buildGuideHeadings,
	calculatorGuideSections,
	guideEditTemplateHint,
	guideSubsectionId,
	type GuideHeading,
	type GuideSection,
} from "@react-client/features/v2/admin/pages/calculatorGuideContent";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import { Card } from "@react-client/common/muiCustom/Card";

const GUIDE_HEADINGS = buildGuideHeadings();
const GUIDE_PATH = routes.adminV2Guide.rootPath;
const SCROLL_PROBE_OFFSET = 88;

/** В теме MuiLink подчёркивание рисуется через ::before, не text-decoration. */
const guideLinkSx = {
	textDecoration: "none",
	"&::before": { display: "none" },
	"&:hover::before": { display: "none" },
} as const;

function guideHash(sectionId: string) {
	return `${GUIDE_PATH}#${sectionId}`;
}

function resolveScrollContainer(
	target: HTMLElement,
	preferred: HTMLElement | null,
): HTMLElement | null {
	if (preferred && preferred.scrollHeight > preferred.clientHeight + 2) {
		return preferred;
	}

	let parent = target.parentElement;
	while (parent) {
		const { overflowY } = getComputedStyle(parent);
		if (
			(overflowY === "auto" ||
				overflowY === "scroll" ||
				overflowY === "overlay") &&
			parent.scrollHeight > parent.clientHeight + 2
		) {
			return parent;
		}
		parent = parent.parentElement;
	}

	return null;
}

function getGuideScrollContainer(preferred: HTMLElement | null): HTMLElement | null {
	const sampleId = GUIDE_HEADINGS[0]?.id;
	const sample = sampleId ? document.getElementById(sampleId) : null;
	if (sample) return resolveScrollContainer(sample, preferred);
	return preferred &&
		preferred.scrollHeight > preferred.clientHeight + 2
		? preferred
		: null;
}

function findActiveHeading(
	headings: GuideHeading[],
	scrollContainer: HTMLElement | null,
): string {
	const probeY = scrollContainer
		? scrollContainer.getBoundingClientRect().top + SCROLL_PROBE_OFFSET
		: SCROLL_PROBE_OFFSET;

	let active = headings[0]?.id ?? "";
	for (const { id } of headings) {
		const el = document.getElementById(id);
		if (!el) continue;
		if (el.getBoundingClientRect().top <= probeY) active = id;
	}
	return active;
}

/** Тот же механизм, что и при открытии /admin/guide#section (scrollMarginTop на заголовках). */
function scrollToHeading(
	sectionId: string,
	behavior: ScrollBehavior = "smooth",
) {
	const el = document.getElementById(sectionId);
	if (!el) return;
	el.scrollIntoView({ behavior, block: "start" });
}

function useGuideScrollSpy(
	headings: GuideHeading[],
	scrollRoot: HTMLElement | null,
) {
	const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
	const syncingRef = useRef(false);
	const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const updateHash = useCallback((sectionId: string) => {
		const url = guideHash(sectionId);
		if (window.location.pathname + window.location.hash !== url) {
			window.history.replaceState(null, "", url);
		}
	}, []);

	/**
	 * Suppress scroll-spy for `ms` milliseconds while a programmatic scroll
	 * is in flight (smooth or instant). Prevents the spy from overwriting
	 * activeId with whatever happens to be visible mid-animation.
	 */
	const suppressSpy = useCallback((ms = 700) => {
		syncingRef.current = true;
		if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
		syncTimerRef.current = setTimeout(() => {
			syncingRef.current = false;
		}, ms);
	}, []);

	const selectSection = useCallback(
		(sectionId: string, options?: { updateHash?: boolean; scroll?: boolean }) => {
			const { updateHash: shouldUpdateHash = true, scroll = true } = options ?? {};
			setActiveId(sectionId);
			if (shouldUpdateHash) updateHash(sectionId);
			if (scroll) {
				suppressSpy(800);
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						scrollToHeading(sectionId, "smooth");
					});
				});
			}
		},
		[scrollRoot, updateHash, suppressSpy],
	);

	// Restore position from URL hash on mount / when scrollRoot becomes available
	useEffect(() => {
		const fromHash = window.location.hash.replace(/^#/, "");
		if (!fromHash || !headings.some((h) => h.id === fromHash)) return;

		setActiveId(fromHash);
		// Double rAF: first frame lets layout settle, second fires the scroll
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				suppressSpy(300);
				scrollToHeading(fromHash, "auto");
			});
		});
	}, [scrollRoot, headings, suppressSpy]);

	useEffect(() => {
		const onScroll = () => {
			if (syncingRef.current) return;
			const container = getGuideScrollContainer(scrollRoot);
			const next = findActiveHeading(headings, container);
			setActiveId((prev) => (prev === next ? prev : next));
		};

		const container = getGuideScrollContainer(scrollRoot);
		container?.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();

		return () => {
			container?.removeEventListener("scroll", onScroll);
			window.removeEventListener("scroll", onScroll);
		};
	}, [headings, scrollRoot]);

	return { activeId, selectSection };
}

function TableOfContents({
	headings,
	activeId,
	onSelect,
}: {
	headings: GuideHeading[];
	activeId: string;
	onSelect: (id: string) => void;
}) {
	return (
		<Box component="nav" aria-label="Содержание справки" sx={{ width: "100%", padding: '10px 7px 10px 11px' }}>
			<Typography variant="subtitle2" sx={{ px: 0.5, pb: 1, fontWeight: 600 }}>
				Содержание
			</Typography>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
				{headings.map(({ id, text, level }) => {
					const selected = activeId === id;
					return (
						<ButtonBase
							key={id}
							onClick={() => onSelect(id)}
							sx={{
								display: "block",
								width: "100%",
								textAlign: "left",
								pl: (level - 2) * 2 + 1,
								py: 0.5,
								pr: 0.75,
								borderRadius: 1,
								fontSize: 14,
								lineHeight: 1.35,
								color: selected ? "primary.main" : "text.secondary",
								fontWeight: selected ? 600 : 400,
								bgcolor: selected ? "action.selected" : "transparent",
								transition: "color 0.2s, background-color 0.2s",
								"&:hover": {
									bgcolor: selected ? "action.selected" : "action.hover",
								},
							}}
						>
							{text}
						</ButtonBase>
					);
				})}
			</Box>
		</Box>
	);
}

function GuideHeading({
	id,
	level,
	onActivate,
	children,
}: {
	id: string;
	level: 2 | 3;
	onActivate: (id: string) => void;
	children: React.ReactNode;
}) {
	return (
		<Box
			component={level === 2 ? "h2" : "h3"}
			id={id}
			onClick={() => onActivate(id)}
			sx={{
				m: 0,
				mb: level === 2 ? 1 : 0.5,
				fontWeight: level === 2 ? 600 : 500,
				fontSize: level === 2 ? undefined : "0.95rem",
				lineHeight: 1.35,
				cursor: "pointer",
				scrollMarginTop: `${SCROLL_PROBE_OFFSET}px`,
				display: "inline-flex",
				alignItems: "center",
				gap: 0.5,
				color: "text.primary",
				"&:hover": { color: "primary.main" },
				"&:hover .guide-heading-anchor": { opacity: 1 },
			}}
		>
			{children}
			<Box
				component="span"
				className="guide-heading-anchor"
				aria-hidden
				sx={{
					opacity: 0,
					fontSize: "0.85em",
					color: "text.disabled",
					transition: "opacity 0.15s",
				}}
			>
				#
			</Box>
		</Box>
	);
}

function GuidePanel({
	children,
	sx,
}: {
	children: React.ReactNode;
	sx?: SxProps<Theme>;
}) {
	return (
		<Paper
			variant="outlined"
			sx={{
				p: "12px 14px",
				mb: 1.5,
				borderRadius: 1,
				...sx,
			}}
		>
			{children}
		</Paper>
	);
}

function GuideBlock({
	section,
	onActivate,
}: {
	section: GuideSection;
	onActivate: (id: string) => void;
}) {
	return (
		<Box component="section">
			<GuideHeading id={section.id} level={2} onActivate={onActivate}>
				{section.title}
			</GuideHeading>
			{section.paragraphs?.map((p) => (
				<Typography key={p.slice(0, 40)} variant="body2" color="text.secondary" paragraph>
					{p}
				</Typography>
			))}
			{section.bullets ? (
				<Box component="ul" sx={{ mt: 0, pl: 2.5, mb: 1 }}>
					{section.bullets.map((item) => (
						<Typography
							key={item.slice(0, 48)}
							component="li"
							variant="body2"
							color="text.secondary"
							sx={{ mb: 0.75 }}
						>
							{item}
						</Typography>
					))}
				</Box>
			) : null}
			{section.subsections?.map((sub) => {
				const subId = guideSubsectionId(section.id, sub.title);
				return (
					<Box key={subId} component="article" sx={{ mb: 2 }}>
						<GuideHeading id={subId} level={3} onActivate={onActivate}>
							{sub.title}
						</GuideHeading>
						{sub.paragraphs?.map((p) => (
							<Typography
								key={p.slice(0, 40)}
								variant="body2"
								color="text.secondary"
								paragraph
							>
								{p}
							</Typography>
						))}
						{sub.bullets ? (
							<Box component="ul" sx={{ mt: 0, pl: 2.5, mb: 0 }}>
								{sub.bullets.map((item) => (
									<Typography
										key={item.slice(0, 48)}
										component="li"
										variant="body2"
										color="text.secondary"
										sx={{ mb: 0.5 }}
									>
										{item}
									</Typography>
								))}
							</Box>
						) : null}
					</Box>
				);
			})}
			{section.links?.length ? (
				<Flex gap={2} sx={{ flexWrap: "wrap", mt: 1 }}>
					{section.links.map((l) => (
						<Link
							key={l.href}
							component={RouterLink}
							to={l.href}
							underline="none"
							sx={guideLinkSx}
						>
							{l.label}
						</Link>
					))}
				</Flex>
			) : null}
		</Box>
	);
}

export function AdminV2GuidePage() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);

	const setScrollRef = useCallback((node: HTMLDivElement | null) => {
		scrollRef.current = node;
		setScrollRoot(node);
	}, []);

	const { activeId, selectSection } = useGuideScrollSpy(GUIDE_HEADINGS, scrollRoot);

	const activateHeading = useCallback(
		(id: string) => selectSection(id, { updateHash: true, scroll: true }),
		[selectSection],
	);

	return (
		<Flex
			flexDirection="col"
			flexGrow={1}
			minHeight="0"
			height="-webkit-fill-available"
		>
			<Header title={routes.adminV2Guide.name} />
			<Box
				sx={{
					flex: 1,
					minHeight: 0,
					overflow: "hidden",
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "260px 1fr" },
					columnGap: 1.5,
				}}
			>
				<Box
					component="aside"
					sx={{
						minHeight: 0,
						overflowY: "auto",
						overflowX: "hidden",
					}}
				>
					<Card sx={{ position: "fixed", width: "260px", padding: 0 }}>
						<TableOfContents
							headings={GUIDE_HEADINGS}
							activeId={activeId}
							onSelect={activateHeading}
						/>
					</Card>
				</Box>

				<Box
					ref={setScrollRef}
					component="main"
					sx={{
						minWidth: 0,
						minHeight: 0,
						overflowY: "auto",
						overflowX: "hidden",
						pr: 0.5,
						pb: 2,
					}}
				>
					<GuidePanel>
						<Flex alignItems="center" gap={1} sx={{ mb: 0.75 }}>
							<MenuBookOutlinedIcon color="primary" fontSize="small" />
							<Typography variant="h5" component="h1">
								Работа с калькулятором (V2)
							</Typography>
						</Flex>
						<Typography variant="body2" color="text.secondary">
							{CALCULATOR_GUIDE_INTRO}
						</Typography>
						<Typography
							variant="caption"
							color="text.secondary"
							display="block"
							sx={{ mt: 1 }}
						>
							{guideEditTemplateHint}
						</Typography>
					</GuidePanel>

					<GuidePanel sx={{ mb: 0 }}>
						{calculatorGuideSections.map((section, index) => (
							<Box key={section.id}>
								{index > 0 ? <Divider sx={{ my: 2 }} /> : null}
								<GuideBlock section={section} onActivate={activateHeading} />
							</Box>
						))}
					</GuidePanel>
				</Box>
			</Box>
		</Flex>
	);
}

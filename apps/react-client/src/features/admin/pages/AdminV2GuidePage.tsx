import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	CALCULATOR_GUIDE_INTRO,
	calculatorGuideSections,
	guideEditTemplateHint,
	type GuideSection,
} from "@react-client/features/admin/V2Admin/content/calculatorGuideContent";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { routes } from "@react-client/routing/routes";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type RefObject,
} from "react";
import { Link as RouterLink, useLocation } from "react-router";

const SECTION_IDS = calculatorGuideSections.map((s) => s.id);
const GUIDE_PATH = routes.adminV2Guide.rootPath;

function guideHashLink(sectionId: string) {
	return `${GUIDE_PATH}#${sectionId}`;
}

function useActiveGuideSection(scrollRoot: RefObject<HTMLElement | null>) {
	const { hash } = useLocation();
	const [activeId, setActiveId] = useState(() => {
		const fromHash = hash.replace(/^#/, "");
		return SECTION_IDS.includes(fromHash) ? fromHash : SECTION_IDS[0]!;
	});
	const skipHashScrollRef = useRef(false);

	const scrollToSection = useCallback(
		(sectionId: string, behavior: ScrollBehavior = "smooth") => {
			const run = () => {
				const root = scrollRoot.current;
				const el = document.getElementById(sectionId);
				if (!el) return;

				if (!root) {
					el.scrollIntoView({ behavior, block: "start" });
					return;
				}

				const top =
					el.getBoundingClientRect().top -
					root.getBoundingClientRect().top +
					root.scrollTop -
					12;

				root.scrollTo({ top: Math.max(0, top), behavior });
			};

			requestAnimationFrame(() => requestAnimationFrame(run));
		},
		[scrollRoot],
	);

	const setHash = useCallback((sectionId: string) => {
		const url = guideHashLink(sectionId);
		if (window.location.pathname + window.location.hash !== url) {
			window.history.replaceState(null, "", url);
		}
	}, []);

	useEffect(() => {
		const fromHash = hash.replace(/^#/, "");
		if (!fromHash || !SECTION_IDS.includes(fromHash)) return;
		if (skipHashScrollRef.current) {
			skipHashScrollRef.current = false;
			return;
		}

		setActiveId(fromHash);
		requestAnimationFrame(() => scrollToSection(fromHash, "auto"));
	}, [hash, scrollToSection]);

	useLayoutEffect(() => {
		const root = scrollRoot.current;
		if (!root) return;

		let observer: IntersectionObserver | undefined;

		const attach = () => {
			const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
				(el): el is HTMLElement => Boolean(el),
			);
			if (elements.length === 0) return;

			observer?.disconnect();
			observer = new IntersectionObserver(
				(entries) => {
					const visible = entries
						.filter((e) => e.isIntersecting)
						.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

					const id = visible[0]?.target.id;
					if (!id || !SECTION_IDS.includes(id)) return;

					setActiveId(id);
					skipHashScrollRef.current = true;
					setHash(id);
				},
				{ root, rootMargin: "-64px 0px -55% 0px", threshold: [0, 0.15, 0.4] },
			);

			for (const el of elements) observer.observe(el);
		};

		attach();
		const retry = window.setTimeout(attach, 0);

		return () => {
			window.clearTimeout(retry);
			observer?.disconnect();
		};
	}, [scrollRoot, setHash]);

	useEffect(() => {
		const onPopState = () => {
			const fromHash = window.location.hash.replace(/^#/, "");
			if (!SECTION_IDS.includes(fromHash)) return;
			setActiveId(fromHash);
			requestAnimationFrame(() => scrollToSection(fromHash, "auto"));
		};
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, [scrollToSection]);

	const selectSection = useCallback(
		(sectionId: string) => {
			setActiveId(sectionId);
			skipHashScrollRef.current = true;
			setHash(sectionId);
			scrollToSection(sectionId);
		},
		[scrollToSection, setHash],
	);

	return { activeId, selectSection };
}

function GuideBlock({ section }: { section: GuideSection }) {
	return (
		<Box component="section" id={section.id} sx={{ scrollMarginTop: 16 }}>
			<Typography variant="h6" component="h2" gutterBottom>
				{section.title}
			</Typography>
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
			{section.subsections?.map((sub) => (
				<Box key={sub.title} sx={{ mb: 2 }}>
					<Typography variant="subtitle2" component="h3" gutterBottom>
						{sub.title}
					</Typography>
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
			))}
			{section.links?.length ? (
				<Flex gap={2} sx={{ flexWrap: "wrap", mt: 1 }}>
					{section.links.map((l) => (
						<Link key={l.href} component={RouterLink} to={l.href} underline="hover">
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
	const { activeId, selectSection } = useActiveGuideSection(scrollRef);

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				flex: 1,
				minHeight: 0,
				width: "100%",
				height: "100%",
				overflow: "hidden",
			}}
		>
			<Header title={routes.adminV2Guide.name} />
			<Box
				sx={{
					display: "flex",
					flex: 1,
					minHeight: 0,
					width: "100%",
					gap: 1.5,
					px: 1,
					pb: 1,
					overflow: "hidden",
				}}
			>
				<Card
					overflow=""
					sx={{
						width: 260,
						flexShrink: 0,
						alignSelf: "stretch",
						display: { xs: "none", md: "flex" },
						flexDirection: "column",
						padding: "8px 4px",
						maxHeight: "100%",
						height: "auto",
						"& > div": { overflow: "auto", maxHeight: "100%" },
					}}
				>
					<Typography variant="subtitle2" sx={{ px: 1, pb: 1 }}>
						Содержание
					</Typography>
					<List dense disablePadding component="nav" aria-label="Содержание справки">
						{calculatorGuideSections.map((s) => {
							const selected = activeId === s.id;
							return (
								<ListItem key={s.id} disablePadding>
									<ListItemButton
										selected={selected}
										onClick={() => selectSection(s.id)}
										sx={{
											py: 0.75,
											borderRadius: 1,
											bgcolor: selected ? "action.selected" : "transparent",
											"&.Mui-selected": { bgcolor: "action.selected" },
											"&.Mui-selected:hover": { bgcolor: "action.hover" },
										}}
									>
										<ListItemText
											primary={s.title}
											primaryTypographyProps={{
												variant: "body2",
												fontWeight: selected ? 600 : 400,
												color: selected ? "primary.main" : "text.primary",
											}}
										/>
									</ListItemButton>
								</ListItem>
							);
						})}
					</List>
				</Card>

				<Box
					ref={scrollRef}
					sx={{
						flex: 1,
						minWidth: 0,
						minHeight: 0,
						overflow: "auto",
					}}
				>
					<Card overflow="" sx={{ padding: "12px 14px", mb: 1.5, maxHeight: "none", height: "auto" }}>
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
					</Card>

					<Card overflow="" sx={{ padding: "12px 14px", maxHeight: "none", height: "auto" }}>
						{calculatorGuideSections.map((section, index) => (
							<Box key={section.id}>
								{index > 0 ? <Divider sx={{ my: 2 }} /> : null}
								<GuideBlock section={section} />
							</Box>
						))}
					</Card>
				</Box>
			</Box>
		</Box>
	);
}

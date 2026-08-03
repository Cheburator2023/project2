import { styled } from "@mui/material/styles";
export type TFlexboxProps = {
	fillChild?: boolean;
	height?: string;
	width?: string;
	maxHeight?: string;
	maxWidth?: string;
	minHeight?: string;
	minWidth?: string | number;
	padding?: string;
	pad?: string;
	margin?: string;
	position?: "absolute" | "relative" | "fixed" | "sticky" | "static";
	pointerEvents?:
		| "none"
		| "auto"
		| "all"
		| "visible"
		| "visibleFill"
		| "painted"
		| "paintedFill";
	top?: number | string;
	left?: number | string;
	right?: number | string;
	bottom?: number | string;
	zIndex?: number;
	flexDirection?:
		| "row"
		| "col"
		| "column"
		| "row-reverse"
		| "column-reverse"
		| "col-reverse"
		| "inherit"
		| "initial"
		| "unset";
	wrap?: "wrap" | "nowrap" | "wrap-reverse";
	gap?: number;
	justifyContent?:
		| "start"
		| "end"
		| "center"
		| "left"
		| "right"
		| "space-between"
		| "space-around"
		| "space-evenly"
		| "stretch"
		| "baseline"
		| "first baseline"
		| "last baseline"
		| "safe center"
		| "unsafe center"
		| "flex-start"
		| "flex-end";
	alignContent?:
		| "start"
		| "end"
		| "center"
		| "space-between"
		| "space-around"
		| "space-evenly"
		| "stretch"
		| "baseline"
		| "first baseline"
		| "last baseline"
		| "safe center"
		| "unsafe center";
	alignItems?:
		| "start"
		| "end"
		| "center"
		| "stretch"
		| "self-start"
		| "self-end"
		| "baseline"
		| "first baseline"
		| "last baseline"
		| "safe center"
		| "unsafe center"
		| "flex-start"
		| "flex-end";
	flexShrink?: number | string;
	flexGrow?: number | string;
	flexBasis?: number | string;
};

export const Flex = styled("div")<TFlexboxProps>`
  display: flex;
  ${(props) => `
    ${
			props.height || typeof props.height === "number"
				? `height: ${typeof props.height === "number" ? `${props.height}px` : props.height};`
				: ""
		}
    ${
			props.width || typeof props.width === "number"
				? `width: ${typeof props.width === "number" ? `${props.width}px` : props.width};`
				: ""
		} 
    ${
			props.padding || props.pad
				? `padding: ${props.padding || props.pad};`
				: ""
		}          
    ${
			props.maxHeight || typeof props.maxHeight === "number"
				? `max-height: ${
						typeof props.maxHeight === "number"
							? `${props.maxHeight}px`
							: props.maxHeight
					};`
				: ""
		}
    ${
			props.maxWidth || typeof props.maxWidth === "number"
				? `max-width: ${
						typeof props.maxWidth === "number"
							? `${props.maxWidth}px`
							: props.maxWidth
					};`
				: ""
		}
    ${
			props.minHeight || typeof props.minHeight === "number"
				? `min-height: ${
						typeof props.minHeight === "number"
							? `${props.minHeight}px`
							: props.minHeight
					};`
				: ""
		}
    ${
			props.minWidth || typeof props.minWidth === "number"
				? `min-width: ${
						typeof props.minWidth === "number"
							? `${props.minWidth}px`
							: props.minWidth
					};`
				: ""
		}
    flex-direction: ${
			props.flexDirection === "col"
				? "column"
				: props.flexDirection === "col-reverse"
					? "column-reverse"
					: (props.flexDirection ?? "row")
		};
    ${props.wrap ? `flex-wrap: ${props.wrap};` : ""}
    justify-content: ${props.justifyContent ?? "stretch"};
    ${props.alignContent ? `align-content: ${props.alignContent};` : ""}
    align-items: ${props.alignItems ?? "stretch"};
    ${props.gap ? `grid-gap: ${props.gap}px;` : ""}
    ${
			props.flexShrink || typeof props.flexShrink === "number"
				? `flex-shrink: ${
						typeof props.flexShrink === "number"
							? `${props.flexShrink}`
							: props.flexShrink
					};`
				: ""
		}
    ${
			props.flexGrow || typeof props.flexGrow === "number"
				? `flex-grow: ${typeof props.flexGrow === "number" ? `${props.flexGrow}` : props.flexGrow};`
				: ""
		}
    ${props.flexBasis || props.flexBasis === 0 ? `flex-basis: ${props.flexBasis};` : ""}
    ${props.position ? `position: ${props.position};` : ""}
    ${props.top || props.top === 0 ? `top: ${props.top};` : ""}
    ${props.left || props.left === 0 ? `left: ${props.left};` : ""}
    ${props.right || props.right === 0 ? `right: ${props.right};` : ""}
    ${props.bottom || props.bottom === 0 ? `bottom: ${props.bottom};` : ""}
    ${props.zIndex || props.zIndex === 0 ? `z-index: ${props.zIndex};` : ""}
	${props.pointerEvents ? `pointer-events: ${props.pointerEvents};` : ""}
	${props.margin ? `margin: ${props.margin};` : ""}

    & > * {
    ${props.fillChild ? "width: 100%;" : ""}
    }
    
  `}
`;

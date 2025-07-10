interface RegExpToken {
	type: string;
	value: string;
	quantifier?: string;
	children?: RegExpToken[];
}

type TOptions = {
	required?: boolean;
};

export function regexpToHuman(pattern: string, options: TOptions = {}): string {
	try {
		const tokens = tokenizeRegExp(pattern);
		return describeTokens(tokens, options);
	} catch (error) {
		return `Ошибка при разборе регулярного выражения: ${error}`;
	}
}

function tokenizeRegExp(pattern: string): RegExpToken[] {
	const tokens: RegExpToken[] = [];
	let i = 0;

	while (i < pattern.length) {
		const char = pattern[i];

		switch (char) {
			case "^":
				tokens.push({ type: "anchor", value: "start" });
				i++;
				break;
			case "$":
				tokens.push({ type: "anchor", value: "end" });
				i++;
				break;
			case "\\":
				if (i + 1 < pattern.length) {
					const nextChar = pattern[i + 1];
					if (nextChar === "d") {
						tokens.push({ type: "character_class", value: "digit" });
						i += 2;
					} else if (nextChar === "w") {
						tokens.push({ type: "character_class", value: "word" });
						i += 2;
					} else if (nextChar === "s") {
						tokens.push({ type: "character_class", value: "whitespace" });
						i += 2;
					} else {
						tokens.push({ type: "literal", value: nextChar });
						i += 2;
					}
				} else {
					tokens.push({ type: "literal", value: "\\" });
					i++;
				}
				break;
			case "(": {
				const groupResult = parseGroup(pattern, i);
				tokens.push(groupResult.token);
				i = groupResult.endIndex;
				break;
			}
			case "[": {
				const charSetResult = parseCharacterSet(pattern, i);
				tokens.push(charSetResult.token);
				i = charSetResult.endIndex;
				break;
			}
			case ".":
				tokens.push({ type: "wildcard", value: "any" });
				i++;
				break;
			case "*":
				if (tokens.length > 0) {
					tokens[tokens.length - 1].quantifier = "zero_or_more";
				}
				i++;
				break;
			case "+":
				if (tokens.length > 0) {
					tokens[tokens.length - 1].quantifier = "one_or_more";
				}
				i++;
				break;
			case "?":
				if (tokens.length > 0) {
					tokens[tokens.length - 1].quantifier = "optional";
				}
				i++;
				break;
			case "{": {
				const quantifierResult = parseQuantifier(pattern, i);
				if (tokens.length > 0) {
					tokens[tokens.length - 1].quantifier = quantifierResult.quantifier;
				}
				i = quantifierResult.endIndex;
				break;
			}
			case "|":
				tokens.push({ type: "alternation", value: "or" });
				i++;
				break;
			default:
				tokens.push({ type: "literal", value: char });
				i++;
				break;
		}
	}

	return tokens;
}

function parseGroup(
	pattern: string,
	startIndex: number,
): { token: RegExpToken; endIndex: number } {
	let i = startIndex + 1; // Skip opening '('
	let depth = 1;
	let groupContent = "";

	while (i < pattern.length && depth > 0) {
		if (pattern[i] === "(") {
			depth++;
		} else if (pattern[i] === ")") {
			depth--;
		}

		if (depth > 0) {
			groupContent += pattern[i];
		}
		i++;
	}

	const children = tokenizeRegExp(groupContent);
	return {
		token: { type: "group", value: "group", children },
		endIndex: i,
	};
}

function parseCharacterSet(
	pattern: string,
	startIndex: number,
): { token: RegExpToken; endIndex: number } {
	let i = startIndex + 1; // Skip opening '['
	let content = "";

	while (i < pattern.length && pattern[i] !== "]") {
		content += pattern[i];
		i++;
	}

	if (i < pattern.length) {
		i++; // Skip closing ']'
	}

	return {
		token: { type: "character_set", value: content },
		endIndex: i,
	};
}

function parseQuantifier(
	pattern: string,
	startIndex: number,
): { quantifier: string; endIndex: number } {
	let i = startIndex + 1; // Skip opening '{'
	let content = "";

	while (i < pattern.length && pattern[i] !== "}") {
		content += pattern[i];
		i++;
	}

	if (i < pattern.length) {
		i++; // Skip closing '}'
	}

	return {
		quantifier: content,
		endIndex: i,
	};
}

function describeTokens(tokens: RegExpToken[], options: TOptions): string {
	const descriptions: string[] = [];

	let hasOptionalGroup = false;

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		const description = describeToken(token, options);

		// Check if we have an optional group
		if (token.type === "group" && token.quantifier === "optional") {
			hasOptionalGroup = true;
		}

		// Check if we need to combine consecutive literals
		if (token.type === "literal" && !token.quantifier) {
			let literalSequence = token.value;
			let j = i + 1;

			// Collect consecutive literals without quantifiers
			while (
				j < tokens.length &&
				tokens[j].type === "literal" &&
				!tokens[j].quantifier
			) {
				literalSequence += tokens[j].value;
				j++;
			}

			if (j > i + 1) {
				// We have a sequence of literals
				descriptions.push(`текст "${literalSequence}"`);
				i = j - 1; // Skip the processed tokens
			} else {
				descriptions.push(description);
			}
		} else {
			descriptions.push(description);
		}
	}

	console.log("🐸 Pepe said >> describeTokens >> descriptions:", descriptions);

	// Join with proper connectors
	let result = "";
	for (let i = 0; i < descriptions.length; i++) {
		if (i === 0) {
			result = descriptions[i];
		} else if (i === descriptions.length - 1) {
			result += " и " + descriptions[i];
		} else {
			result += " " + descriptions[i];
		}
	}

	// Clean up double "и"
	result = result.replace(/\s+и\s+и\s+/g, " и ");
	result = result.replace(/\s+и\s*$/, "");

	// Add "или пустая строка" if we have optional groups
	if (hasOptionalGroup && !options.required) {
		result += " или пустая строка";
	}

	return result;
}

function describeToken(token: RegExpToken, options: TOptions): string {
	let description = "";

	switch (token.type) {
		case "anchor":
			if (token.value === "start") {
				description = "строка должна начинаться с";
			} else if (token.value === "end") {
				description = "и заканчиваться";
			}
			break;
		case "literal":
			description = `символ "${token.value}"`;
			break;
		case "character_class":
			if (token.value === "digit") {
				description = "цифра";
			} else if (token.value === "word") {
				description = "буквенно-цифровой символ";
			} else if (token.value === "whitespace") {
				description = "пробельный символ";
			}
			break;
		case "wildcard":
			description = "любой символ";
			break;
		case "group":
			if (token.children) {
				const groupContent = describeTokens(token.children, options);

				if (token.quantifier) {
					description = `группы (${groupContent})`;
				} else {
					description = groupContent;
				}
			} else {
				description = "группа";
			}
			break;
		case "character_set":
			description = `набор символов [${token.value}]`;
			break;
		case "alternation":
			description = "или";
			break;
		default:
			description = token.value;
			break;
	}

	// Add quantifier description
	if (token.quantifier) {
		switch (token.quantifier) {
			case "zero_or_more":
				description += " (ноль или более раз)";
				break;
			case "one_or_more":
				description += " (один или более раз)";
				break;
			case "optional":
				// Don't add (необязательно) for groups, handle it in describeTokens
				if (token.type !== "group") {
					description += " (необязательно)";
				}
				break;
			default:
				// Handle numeric quantifiers like {4,15}
				if (token.quantifier.includes(",")) {
					const [min, max] = token.quantifier.split(",");
					if (max) {
						if (token.type === "character_class") {
							if (token.value === "digit") {
								description = `от ${min} до ${max} цифр`;
							} else if (token.value === "word") {
								description = `от ${min} до ${max} буквенно-цифровых символов`;
							} else if (token.value === "whitespace") {
								description = `от ${min} до ${max} пробельных символов`;
							}
						} else {
							description += ` (от ${min} до ${max} раз)`;
						}
					} else {
						if (token.type === "character_class") {
							if (token.value === "digit") {
								description = `минимум ${min} цифр`;
							} else if (token.value === "word") {
								description = `минимум ${min} буквенно-цифровых символов`;
							} else if (token.value === "whitespace") {
								description = `минимум ${min} пробельных символов`;
							}
						} else {
							description += ` (минимум ${min} раз)`;
						}
					}
				} else {
					if (token.type === "character_class") {
						if (token.value === "digit") {
							description = `ровно ${token.quantifier} цифр`;
						} else if (token.value === "word") {
							description = `ровно ${token.quantifier} буквенно-цифровых символов`;
						} else if (token.value === "whitespace") {
							description = `ровно ${token.quantifier} пробельных символов`;
						}
					} else {
						description += ` (ровно ${token.quantifier} раз)`;
					}
				}
				break;
		}
	}

	return description;
}

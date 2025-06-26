// runner.js - Simple runner script
const { execSync } = require("child_process");
const path = require("path");

const codemodPath = path.join(__dirname, "add-test-ids.js");
const srcPath = process.argv[2] || "src/";

try {
	console.log("Running React TestId Codemod...");

	const command = `npx jscodeshift -t ${codemodPath} --parser=tsx --extensions=tsx,ts,jsx,js ${srcPath}`;

	console.log(`Executing: ${command}`);

	execSync(command, {
		stdio: "inherit",
		cwd: process.cwd(),
	});

	console.log("✅ Codemod completed successfully!");
} catch (error) {
	console.error("❌ Codemod failed:", error.message);
	process.exit(1);
}

// package.json scripts addition
/*
{
  "scripts": {
    "add-test-ids": "node runner.js",
    "add-test-ids:interactive": "jscodeshift -t add-test-ids.js --parser=tsx --transform=interactiveOnly",
    "add-test-ids:components": "jscodeshift -t add-test-ids.js --parser=tsx --transform=customOnly"
  },
  "devDependencies": {
    "jscodeshift": "^0.15.1"
  }
}
*/

// Advanced configuration example
const fs = require("fs");

function createConfigFile() {
	const config = {
		testableElements: [
			"div",
			"span",
			"section",
			"button",
			"input",
			"form",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"ul",
			"ol",
			"li",
			"table",
			"tr",
			"td",
		],
		includeCustomComponents: true,
		testIdPrefix: "qa-",
		excludePatterns: [
			/^Motion/, // Framer Motion components
			/^Styled/, // Styled components
			/Icon$/, // Icon components
			/^_/, // Private components
		],
		contextualNaming: true,
		filePatterns: ["**/*.jsx", "**/*.tsx"],
		ignoreFiles: ["**/*.test.*", "**/*.stories.*"],
	};

	fs.writeFileSync(
		"testid-codemod.config.js",
		`module.exports = ${JSON.stringify(config, null, 2)};`,
	);
	console.log("Created testid-codemod.config.js");
}

// Dry run function
function dryRun(filePath) {
	const { transform } = require("./add-test-ids.js");
	const fs = require("fs");

	const source = fs.readFileSync(filePath, "utf8");
	const result = transform({ source }, { jscodeshift: require("jscodeshift") });

	console.log("=== BEFORE ===");
	console.log(source);
	console.log("\n=== AFTER ===");
	console.log(result);
}

// Export utilities
module.exports = {
	createConfigFile,
	dryRun,
};

// Usage examples:
/*

// Basic usage
node runner.js src/

// Dry run on single file
node -e "require('./runner.js').dryRun('src/components/Button.jsx')"

// Create config file
node -e "require('./runner.js').createConfigFile()"

// Advanced usage with custom transform
npx jscodeshift -t add-test-ids.js --parser=tsx --dry --print src/components/

*/

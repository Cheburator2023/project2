var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// package.json
var require_package = __commonJS({
  "package.json"(exports, module) {
    module.exports = {
      name: "react-client",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "npm run dev:vite",
        "dev:vite": "cross-env NODE_ENV=development vite serve",
        "build:vite": "cross-env NODE_ENV=production vite build",
        "start:vite": "serve -s build",
        "serve:vite": "npm run build:vite && PORT=8004 npx serve ./dist",
        "build:webpack": "webpack --mode production --config webpack.prod.js",
        "dev:webpack": "webpack serve --mode development --config ./webpack.dev.js",
        "serve:webpack": "npm run build:webpack && PORT=8004 npx serve ./dist",
        prod: "npm build && npm start",
        biome: "npx @biomejs/biome check",
        "biome:fix": "npx @biomejs/biome check --log-level=error --diagnostic-level=error --fix --unsafe ./src",
        "generate:orval": "npx orval --config ./orval.config.js"
      },
      dependencies: {
        "@emotion/react": "11.14.0",
        "@emotion/styled": "11.14.0",
        "@monaco-editor/react": "4.7.0",
        "@mui/icons-material": "7.1.0",
        "@mui/material": "7.1.0",
        "@mui/utils": "7.1.0",
        "@mui/x-charts": "7.29.1",
        "@mui/x-data-grid": "7.28.2",
        "@mui/x-data-grid-pro": "7.28.2",
        "@mui/x-date-pickers": "7.28.2",
        "@mui/x-date-pickers-pro": "7.28.2",
        "@mui/x-tree-view": "7.29.1",
        "@rjsf/core": "6.0.0-beta.10",
        "@rjsf/mui": "6.0.0-beta.10",
        "@rjsf/utils": "6.0.0-beta.10",
        "@rjsf/validator-ajv8": "6.0.0-beta.10",
        "@tanstack/react-query": "5.80.0",
        "@fontsource/inter": "5.2.5",
        "@types/react": "19.1.6",
        "@types/react-dom": "19.1.5",
        axios: "1.8.4",
        "date-fns": "2.30.0",
        "html-to-image": "1.11.11",
        nanoid: "5.0.2",
        "pretty-bytes": "6.1.1",
        "web-vitals": "4.2.4",
        zustand: "5.0.3"
      },
      devDependencies: {
        "@module-federation/vite": "1.4.0",
        "@pmmmwh/react-refresh-webpack-plugin": "0.6.0",
        "@svgr/rollup": "8.1.0",
        "@svgr/webpack": "6.2.1",
        "@vitejs/plugin-react": "4.3.2",
        "bundle-loader": "0.5.6",
        "css-loader": "7.1.2",
        "file-loader": "6.2.0",
        "html-webpack-plugin": "5.5.0",
        orval: "^7.10.0",
        "react-refresh": "0.17.0",
        "style-loader": "4.0.0",
        vite: "5.4.11",
        "vite-plugin-checker": "0.8.0",
        "vite-plugin-node-polyfills": "0.21.0",
        "vite-plugin-static-copy": "1.0.2",
        "vite-plugin-svgr": "4.2.0",
        "vite-tsconfig-paths": "5.0.1",
        webpack: "5.96.1",
        "webpack-cli": "5.1.4",
        "webpack-dev-server": "5.0.4",
        "webpack-merge": "5.10.0"
      }
    };
  }
});

// vite.config.mts
import child_process from "node:child_process";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { federation } from "file:///C:/Users/Sergio/smart_anketa_ui/node_modules/@module-federation/vite/lib/index.cjs";
import svgr from "file:///C:/Users/Sergio/smart_anketa_ui/node_modules/@svgr/rollup/dist/index.js";
import react from "file:///C:/Users/Sergio/smart_anketa_ui/node_modules/@vitejs/plugin-react/dist/index.mjs";
import browserslistToEsbuild from "file:///C:/Users/Sergio/smart_anketa_ui/node_modules/browserslist-to-esbuild/src/index.js";
import { defineConfig, loadEnv } from "file:///C:/Users/Sergio/smart_anketa_ui/node_modules/vite/dist/node/index.js";
import checker from "file:///C:/Users/Sergio/smart_anketa_ui/node_modules/vite-plugin-checker/dist/esm/main.js";
import { nodePolyfills } from "file:///C:/Users/Sergio/smart_anketa_ui/node_modules/vite-plugin-node-polyfills/dist/index.js";
import tsconfigPaths from "file:///C:/Users/Sergio/smart_anketa_ui/node_modules/vite-tsconfig-paths/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Sergio\\smart_anketa_ui\\apps\\react-client";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Sergio/smart_anketa_ui/apps/react-client/vite.config.mts";
var APP_NAME = "smartAnketa";
var deps = require_package().dependencies;
var publicEnvVars = [];
var { STAGE } = process.env;
var IS_DEV = process.env.NODE_ENV === "development";
var ROOT_DIR = path.resolve(__vite_injected_original_dirname, "./");
var DIST_DIR = path.resolve(ROOT_DIR, "./dist");
var proxyList = {
  dev: "https://example.com"
};
var currentTarget = STAGE ? proxyList[STAGE] : proxyList.dev;
var git_revision = child_process.execSync('git show --format="short" -s').toString().trim();
var viteCommonConfig = ({
  appName,
  base = "/"
}) => defineConfig(({ mode }) => {
  const envDir = fileURLToPath(new URL("..", __vite_injected_original_import_meta_url));
  const env = loadEnv(mode, envDir, "");
  for (const key of publicEnvVars) {
    if (!env[key]) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    process.env[`${key}`] = env[key];
  }
  return {
    cacheDir: fileURLToPath(new URL("./.cache/vite-app", __vite_injected_original_import_meta_url)),
    base,
    build: {
      target: browserslistToEsbuild(),
      commonjsOptions: { transformMixedEsModules: true },
      rollupOptions: {
        output: {
          dir: DIST_DIR,
          strict: false,
          entryFileNames: "[name].js",
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"]
          }
        }
      }
    },
    plugins: [
      // {
      //   name: 'deep-index',
      //   configureServer(server) {
      //     server.middlewares.use((req, res, next) => {
      //       if (req.url === '/') {
      //         req.url = '/public/index.html';
      //       }
      //       next();
      //     });
      //   },
      // },
      ...!IS_DEV ? [
        federation({
          name: APP_NAME,
          filename: "remoteEntry.js",
          exposes: {
            "./App": "./src/indexFederated"
          },
          shared: []
        })
      ] : [],
      tsconfigPaths(),
      nodePolyfills({
        // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
        include: ["net"]
      }),
      react(),
      svgr({
        dimensions: false,
        svgProps: {
          focusable: "{false}"
        }
      }),
      // viteStaticCopy({
      //   targets: [{}],
      // }),
      checker({
        biome: {
          dev: {
            logLevel: ["error"]
          }
        },
        typescript: true,
        overlay: {
          initialIsOpen: false
        }
      })
    ],
    define: {
      "process.env.MOCKED_REQUESTS": JSON.stringify(
        process.env.MOCKED_REQUESTS
      ),
      "process.env.GIT_REVISION": JSON.stringify(git_revision),
      "process.env.APP_NAME": JSON.stringify(APP_NAME),
      "process.env.REACT_APP_API_URL": JSON.stringify(
        "http://localhost:3000"
      )
    },
    // resolve: {
    //   alias: [
    //     // packages
    //     {
    //       find: 'types',
    //       replacement: path.resolve('./types'),
    //     },
    //   ],
    // },
    server: {
      // host: "www.test.vtb.ru",
      fs: {
        strict: false,
        cachedChecks: false
      },
      port: 8004,
      proxy: {
        "/api": {
          target: currentTarget,
          secure: false,
          rewrite(_path) {
            return _path.replace(/^\/api/, "");
          },
          changeOrigin: true
        },
        // Proxying websockets
        "/socket": {
          target: currentTarget,
          headers: {
            Origin: currentTarget
          },
          rewrite(_path) {
            return _path.replace(/^\/socket/, "");
          },
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.warn("Socket error using onProxyReqWs event", err);
            });
          },
          ws: true,
          secure: false,
          changeOrigin: true
        }
      }
    }
  };
});
var vite_config_default = viteCommonConfig({});
export {
  vite_config_default as default,
  viteCommonConfig
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicGFja2FnZS5qc29uIiwgInZpdGUuY29uZmlnLm10cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsie1xuXHRcIm5hbWVcIjogXCJyZWFjdC1jbGllbnRcIixcblx0XCJ2ZXJzaW9uXCI6IFwiMS4wLjBcIixcblx0XCJwcml2YXRlXCI6IHRydWUsXG5cdFwic2NyaXB0c1wiOiB7XG5cdFx0XCJkZXZcIjogXCJucG0gcnVuIGRldjp2aXRlXCIsXG5cdFx0XCJkZXY6dml0ZVwiOiBcImNyb3NzLWVudiBOT0RFX0VOVj1kZXZlbG9wbWVudCB2aXRlIHNlcnZlXCIsXG5cdFx0XCJidWlsZDp2aXRlXCI6IFwiY3Jvc3MtZW52IE5PREVfRU5WPXByb2R1Y3Rpb24gdml0ZSBidWlsZFwiLFxuXHRcdFwic3RhcnQ6dml0ZVwiOiBcInNlcnZlIC1zIGJ1aWxkXCIsXG5cdFx0XCJzZXJ2ZTp2aXRlXCI6IFwibnBtIHJ1biBidWlsZDp2aXRlICYmIFBPUlQ9ODAwNCBucHggc2VydmUgLi9kaXN0XCIsXG5cdFx0XCJidWlsZDp3ZWJwYWNrXCI6IFwid2VicGFjayAtLW1vZGUgcHJvZHVjdGlvbiAtLWNvbmZpZyB3ZWJwYWNrLnByb2QuanNcIixcblx0XHRcImRldjp3ZWJwYWNrXCI6IFwid2VicGFjayBzZXJ2ZSAtLW1vZGUgZGV2ZWxvcG1lbnQgLS1jb25maWcgLi93ZWJwYWNrLmRldi5qc1wiLFxuXHRcdFwic2VydmU6d2VicGFja1wiOiBcIm5wbSBydW4gYnVpbGQ6d2VicGFjayAmJiBQT1JUPTgwMDQgbnB4IHNlcnZlIC4vZGlzdFwiLFxuXHRcdFwicHJvZFwiOiBcIm5wbSBidWlsZCAmJiBucG0gc3RhcnRcIixcblx0XHRcImJpb21lXCI6IFwibnB4IEBiaW9tZWpzL2Jpb21lIGNoZWNrXCIsXG5cdFx0XCJiaW9tZTpmaXhcIjogXCJucHggQGJpb21lanMvYmlvbWUgY2hlY2sgLS1sb2ctbGV2ZWw9ZXJyb3IgLS1kaWFnbm9zdGljLWxldmVsPWVycm9yIC0tZml4IC0tdW5zYWZlIC4vc3JjXCIsXG5cdFx0XCJnZW5lcmF0ZTpvcnZhbFwiOiBcIm5weCBvcnZhbCAtLWNvbmZpZyAuL29ydmFsLmNvbmZpZy5qc1wiXG5cdH0sXG5cdFwiZGVwZW5kZW5jaWVzXCI6IHtcblx0XHRcIkBlbW90aW9uL3JlYWN0XCI6IFwiMTEuMTQuMFwiLFxuXHRcdFwiQGVtb3Rpb24vc3R5bGVkXCI6IFwiMTEuMTQuMFwiLFxuXHRcdFwiQG1vbmFjby1lZGl0b3IvcmVhY3RcIjogXCI0LjcuMFwiLFxuXHRcdFwiQG11aS9pY29ucy1tYXRlcmlhbFwiOiBcIjcuMS4wXCIsXG5cdFx0XCJAbXVpL21hdGVyaWFsXCI6IFwiNy4xLjBcIixcblx0XHRcIkBtdWkvdXRpbHNcIjogXCI3LjEuMFwiLFxuXHRcdFwiQG11aS94LWNoYXJ0c1wiOiBcIjcuMjkuMVwiLFxuXHRcdFwiQG11aS94LWRhdGEtZ3JpZFwiOiBcIjcuMjguMlwiLFxuXHRcdFwiQG11aS94LWRhdGEtZ3JpZC1wcm9cIjogXCI3LjI4LjJcIixcblx0XHRcIkBtdWkveC1kYXRlLXBpY2tlcnNcIjogXCI3LjI4LjJcIixcblx0XHRcIkBtdWkveC1kYXRlLXBpY2tlcnMtcHJvXCI6IFwiNy4yOC4yXCIsXG5cdFx0XCJAbXVpL3gtdHJlZS12aWV3XCI6IFwiNy4yOS4xXCIsXG5cdFx0XCJAcmpzZi9jb3JlXCI6IFwiNi4wLjAtYmV0YS4xMFwiLFxuXHRcdFwiQHJqc2YvbXVpXCI6IFwiNi4wLjAtYmV0YS4xMFwiLFxuXHRcdFwiQHJqc2YvdXRpbHNcIjogXCI2LjAuMC1iZXRhLjEwXCIsXG5cdFx0XCJAcmpzZi92YWxpZGF0b3ItYWp2OFwiOiBcIjYuMC4wLWJldGEuMTBcIixcblx0XHRcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiOiBcIjUuODAuMFwiLFxuXHRcdFwiQGZvbnRzb3VyY2UvaW50ZXJcIjogXCI1LjIuNVwiLFxuXHRcdFwiQHR5cGVzL3JlYWN0XCI6IFwiMTkuMS42XCIsXG5cdFx0XCJAdHlwZXMvcmVhY3QtZG9tXCI6IFwiMTkuMS41XCIsXG5cdFx0XCJheGlvc1wiOiBcIjEuOC40XCIsXG5cdFx0XCJkYXRlLWZuc1wiOiBcIjIuMzAuMFwiLFxuXHRcdFwiaHRtbC10by1pbWFnZVwiOiBcIjEuMTEuMTFcIixcblx0XHRcIm5hbm9pZFwiOiBcIjUuMC4yXCIsXG5cdFx0XCJwcmV0dHktYnl0ZXNcIjogXCI2LjEuMVwiLFxuXHRcdFwid2ViLXZpdGFsc1wiOiBcIjQuMi40XCIsXG5cdFx0XCJ6dXN0YW5kXCI6IFwiNS4wLjNcIlxuXHR9LFxuXHRcImRldkRlcGVuZGVuY2llc1wiOiB7XG5cdFx0XCJAbW9kdWxlLWZlZGVyYXRpb24vdml0ZVwiOiBcIjEuNC4wXCIsXG5cdFx0XCJAcG1tbXdoL3JlYWN0LXJlZnJlc2gtd2VicGFjay1wbHVnaW5cIjogXCIwLjYuMFwiLFxuXHRcdFwiQHN2Z3Ivcm9sbHVwXCI6IFwiOC4xLjBcIixcblx0XHRcIkBzdmdyL3dlYnBhY2tcIjogXCI2LjIuMVwiLFxuXHRcdFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjogXCI0LjMuMlwiLFxuXHRcdFwiYnVuZGxlLWxvYWRlclwiOiBcIjAuNS42XCIsXG5cdFx0XCJjc3MtbG9hZGVyXCI6IFwiNy4xLjJcIixcblx0XHRcImZpbGUtbG9hZGVyXCI6IFwiNi4yLjBcIixcblx0XHRcImh0bWwtd2VicGFjay1wbHVnaW5cIjogXCI1LjUuMFwiLFxuXHRcdFwib3J2YWxcIjogXCJeNy4xMC4wXCIsXG5cdFx0XCJyZWFjdC1yZWZyZXNoXCI6IFwiMC4xNy4wXCIsXG5cdFx0XCJzdHlsZS1sb2FkZXJcIjogXCI0LjAuMFwiLFxuXHRcdFwidml0ZVwiOiBcIjUuNC4xMVwiLFxuXHRcdFwidml0ZS1wbHVnaW4tY2hlY2tlclwiOiBcIjAuOC4wXCIsXG5cdFx0XCJ2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxsc1wiOiBcIjAuMjEuMFwiLFxuXHRcdFwidml0ZS1wbHVnaW4tc3RhdGljLWNvcHlcIjogXCIxLjAuMlwiLFxuXHRcdFwidml0ZS1wbHVnaW4tc3ZnclwiOiBcIjQuMi4wXCIsXG5cdFx0XCJ2aXRlLXRzY29uZmlnLXBhdGhzXCI6IFwiNS4wLjFcIixcblx0XHRcIndlYnBhY2tcIjogXCI1Ljk2LjFcIixcblx0XHRcIndlYnBhY2stY2xpXCI6IFwiNS4xLjRcIixcblx0XHRcIndlYnBhY2stZGV2LXNlcnZlclwiOiBcIjUuMC40XCIsXG5cdFx0XCJ3ZWJwYWNrLW1lcmdlXCI6IFwiNS4xMC4wXCJcblx0fVxufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxTZXJnaW9cXFxcc21hcnRfYW5rZXRhX3VpXFxcXGFwcHNcXFxccmVhY3QtY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxTZXJnaW9cXFxcc21hcnRfYW5rZXRhX3VpXFxcXGFwcHNcXFxccmVhY3QtY2xpZW50XFxcXHZpdGUuY29uZmlnLm10c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvU2VyZ2lvL3NtYXJ0X2Fua2V0YV91aS9hcHBzL3JlYWN0LWNsaWVudC92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgY2hpbGRfcHJvY2VzcyBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBVUkwsIGZpbGVVUkxUb1BhdGggfSBmcm9tIFwibm9kZTp1cmxcIjtcbmltcG9ydCB7IGZlZGVyYXRpb24gfSBmcm9tIFwiQG1vZHVsZS1mZWRlcmF0aW9uL3ZpdGVcIjtcbmltcG9ydCBzdmdyIGZyb20gXCJAc3Znci9yb2xsdXBcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCBicm93c2Vyc2xpc3RUb0VzYnVpbGQgZnJvbSBcImJyb3dzZXJzbGlzdC10by1lc2J1aWxkXCI7XG5pbXBvcnQgeyB0eXBlIEh0dHBQcm94eSwgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcbi8vIGltcG9ydCB7IHZpdGVTdGF0aWNDb3B5IH0gZnJvbSAndml0ZS1wbHVnaW4tc3RhdGljLWNvcHknO1xuaW1wb3J0IGNoZWNrZXIgZnJvbSBcInZpdGUtcGx1Z2luLWNoZWNrZXJcIjtcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tIFwidml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHNcIjtcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gXCJ2aXRlLXRzY29uZmlnLXBhdGhzXCI7XG5cbmNvbnN0IEFQUF9OQU1FID0gXCJzbWFydEFua2V0YVwiO1xuXG5jb25zdCBkZXBzID0gcmVxdWlyZShcIi4vcGFja2FnZS5qc29uXCIpLmRlcGVuZGVuY2llcztcblxuY29uc3QgcHVibGljRW52VmFyczogYW55W10gPSBbXTtcbmNvbnN0IHsgU1RBR0UgfSA9IHByb2Nlc3MuZW52O1xuY29uc3QgSVNfREVWID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09IFwiZGV2ZWxvcG1lbnRcIjtcbmNvbnN0IFJPT1RfRElSID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL1wiKTtcbmNvbnN0IERJU1RfRElSID0gcGF0aC5yZXNvbHZlKFJPT1RfRElSLCBcIi4vZGlzdFwiKTtcblxuY29uc3QgcHJveHlMaXN0ID0ge1xuXHRkZXY6IFwiaHR0cHM6Ly9leGFtcGxlLmNvbVwiLFxufTtcbi8vIEB0cy1pZ25vcmVcbmNvbnN0IGN1cnJlbnRUYXJnZXQgPSBTVEFHRSA/IHByb3h5TGlzdFtTVEFHRV0gOiBwcm94eUxpc3QuZGV2O1xuXG5jb25zdCBnaXRfcmV2aXNpb24gPSBjaGlsZF9wcm9jZXNzXG5cdC5leGVjU3luYygnZ2l0IHNob3cgLS1mb3JtYXQ9XCJzaG9ydFwiIC1zJylcblx0LnRvU3RyaW5nKClcblx0LnRyaW0oKTtcblxuZXhwb3J0IGNvbnN0IHZpdGVDb21tb25Db25maWcgPSAoe1xuXHRhcHBOYW1lLFxuXHRiYXNlID0gXCIvXCIsXG59OiB7IGFwcE5hbWU/OiBzdHJpbmc7IGJhc2U/OiBzdHJpbmcgfSkgPT5cblx0ZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSk6IGFueSA9PiB7XG5cdFx0Y29uc3QgZW52RGlyID0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi5cIiwgaW1wb3J0Lm1ldGEudXJsKSk7XG5cdFx0Y29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBlbnZEaXIsIFwiXCIpO1xuXG5cdFx0Zm9yIChjb25zdCBrZXkgb2YgcHVibGljRW52VmFycykge1xuXHRcdFx0aWYgKCFlbnZba2V5XSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7a2V5fWApO1xuXHRcdFx0fVxuXHRcdFx0cHJvY2Vzcy5lbnZbYCR7a2V5fWBdID0gZW52W2tleV07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGNhY2hlRGlyOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuLy5jYWNoZS92aXRlLWFwcFwiLCBpbXBvcnQubWV0YS51cmwpKSxcblx0XHRcdGJhc2UsXG5cdFx0XHRidWlsZDoge1xuXHRcdFx0XHR0YXJnZXQ6IGJyb3dzZXJzbGlzdFRvRXNidWlsZCgpLFxuXHRcdFx0XHRjb21tb25qc09wdGlvbnM6IHsgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWUgfSxcblx0XHRcdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0XHRcdG91dHB1dDoge1xuXHRcdFx0XHRcdFx0ZGlyOiBESVNUX0RJUixcblx0XHRcdFx0XHRcdHN0cmljdDogZmFsc2UsXG5cdFx0XHRcdFx0XHRlbnRyeUZpbGVOYW1lczogXCJbbmFtZV0uanNcIixcblx0XHRcdFx0XHRcdG1hbnVhbENodW5rczoge1xuXHRcdFx0XHRcdFx0XHRyZWFjdDogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXItZG9tXCJdLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblxuXHRcdFx0cGx1Z2luczogW1xuXHRcdFx0XHQvLyB7XG5cdFx0XHRcdC8vICAgbmFtZTogJ2RlZXAtaW5kZXgnLFxuXHRcdFx0XHQvLyAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcblx0XHRcdFx0Ly8gICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdFx0XHRcdC8vICAgICAgIGlmIChyZXEudXJsID09PSAnLycpIHtcblx0XHRcdFx0Ly8gICAgICAgICByZXEudXJsID0gJy9wdWJsaWMvaW5kZXguaHRtbCc7XG5cdFx0XHRcdC8vICAgICAgIH1cblx0XHRcdFx0Ly8gICAgICAgbmV4dCgpO1xuXHRcdFx0XHQvLyAgICAgfSk7XG5cdFx0XHRcdC8vICAgfSxcblx0XHRcdFx0Ly8gfSxcblx0XHRcdFx0Li4uKCFJU19ERVZcblx0XHRcdFx0XHQ/IFtcblx0XHRcdFx0XHRcdFx0ZmVkZXJhdGlvbih7XG5cdFx0XHRcdFx0XHRcdFx0bmFtZTogQVBQX05BTUUsXG5cdFx0XHRcdFx0XHRcdFx0ZmlsZW5hbWU6IFwicmVtb3RlRW50cnkuanNcIixcblx0XHRcdFx0XHRcdFx0XHRleHBvc2VzOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcIi4vQXBwXCI6IFwiLi9zcmMvaW5kZXhGZWRlcmF0ZWRcIixcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdHNoYXJlZDogW10sXG5cdFx0XHRcdFx0XHRcdH0pLFxuXHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdDogW10pLFxuXHRcdFx0XHR0c2NvbmZpZ1BhdGhzKCksXG5cdFx0XHRcdG5vZGVQb2x5ZmlsbHMoe1xuXHRcdFx0XHRcdC8vIFRvIGFkZCBvbmx5IHNwZWNpZmljIHBvbHlmaWxscywgYWRkIHRoZW0gaGVyZS4gSWYgbm8gb3B0aW9uIGlzIHBhc3NlZCwgYWRkcyBhbGwgcG9seWZpbGxzXG5cdFx0XHRcdFx0aW5jbHVkZTogW1wibmV0XCJdLFxuXHRcdFx0XHR9KSxcblx0XHRcdFx0cmVhY3QoKSxcblx0XHRcdFx0c3Zncih7XG5cdFx0XHRcdFx0ZGltZW5zaW9uczogZmFsc2UsXG5cdFx0XHRcdFx0c3ZnUHJvcHM6IHtcblx0XHRcdFx0XHRcdGZvY3VzYWJsZTogXCJ7ZmFsc2V9XCIsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSksXG5cdFx0XHRcdC8vIHZpdGVTdGF0aWNDb3B5KHtcblx0XHRcdFx0Ly8gICB0YXJnZXRzOiBbe31dLFxuXHRcdFx0XHQvLyB9KSxcblx0XHRcdFx0Y2hlY2tlcih7XG5cdFx0XHRcdFx0YmlvbWU6IHtcblx0XHRcdFx0XHRcdGRldjoge1xuXHRcdFx0XHRcdFx0XHRsb2dMZXZlbDogW1wiZXJyb3JcIl0sXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dHlwZXNjcmlwdDogdHJ1ZSxcblx0XHRcdFx0XHRvdmVybGF5OiB7XG5cdFx0XHRcdFx0XHRpbml0aWFsSXNPcGVuOiBmYWxzZSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KSxcblx0XHRcdF0sXG5cblx0XHRcdGRlZmluZToge1xuXHRcdFx0XHRcInByb2Nlc3MuZW52Lk1PQ0tFRF9SRVFVRVNUU1wiOiBKU09OLnN0cmluZ2lmeShcblx0XHRcdFx0XHRwcm9jZXNzLmVudi5NT0NLRURfUkVRVUVTVFMsXG5cdFx0XHRcdCksXG5cdFx0XHRcdFwicHJvY2Vzcy5lbnYuR0lUX1JFVklTSU9OXCI6IEpTT04uc3RyaW5naWZ5KGdpdF9yZXZpc2lvbiksXG5cdFx0XHRcdFwicHJvY2Vzcy5lbnYuQVBQX05BTUVcIjogSlNPTi5zdHJpbmdpZnkoQVBQX05BTUUpLFxuXHRcdFx0XHRcInByb2Nlc3MuZW52LlJFQUNUX0FQUF9BUElfVVJMXCI6IEpTT04uc3RyaW5naWZ5KFxuXHRcdFx0XHRcdFwiaHR0cDovL2xvY2FsaG9zdDozMDAwXCIsXG5cdFx0XHRcdCksXG5cdFx0XHR9LFxuXG5cdFx0XHQvLyByZXNvbHZlOiB7XG5cdFx0XHQvLyAgIGFsaWFzOiBbXG5cdFx0XHQvLyAgICAgLy8gcGFja2FnZXNcblx0XHRcdC8vICAgICB7XG5cdFx0XHQvLyAgICAgICBmaW5kOiAndHlwZXMnLFxuXHRcdFx0Ly8gICAgICAgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZSgnLi90eXBlcycpLFxuXHRcdFx0Ly8gICAgIH0sXG5cdFx0XHQvLyAgIF0sXG5cdFx0XHQvLyB9LFxuXG5cdFx0XHRzZXJ2ZXI6IHtcblx0XHRcdFx0Ly8gaG9zdDogXCJ3d3cudGVzdC52dGIucnVcIixcblx0XHRcdFx0ZnM6IHtcblx0XHRcdFx0XHRzdHJpY3Q6IGZhbHNlLFxuXHRcdFx0XHRcdGNhY2hlZENoZWNrczogZmFsc2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHBvcnQ6IDgwMDQsXG5cdFx0XHRcdHByb3h5OiB7XG5cdFx0XHRcdFx0XCIvYXBpXCI6IHtcblx0XHRcdFx0XHRcdHRhcmdldDogY3VycmVudFRhcmdldCxcblx0XHRcdFx0XHRcdHNlY3VyZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRyZXdyaXRlKF9wYXRoOiBzdHJpbmcpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIF9wYXRoLnJlcGxhY2UoL15cXC9hcGkvLCBcIlwiKTtcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRjaGFuZ2VPcmlnaW46IHRydWUsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHQvLyBQcm94eWluZyB3ZWJzb2NrZXRzXG5cdFx0XHRcdFx0XCIvc29ja2V0XCI6IHtcblx0XHRcdFx0XHRcdHRhcmdldDogY3VycmVudFRhcmdldCxcblx0XHRcdFx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XHRcdFx0T3JpZ2luOiBjdXJyZW50VGFyZ2V0LFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdHJld3JpdGUoX3BhdGg6IHN0cmluZykge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gX3BhdGgucmVwbGFjZSgvXlxcL3NvY2tldC8sIFwiXCIpO1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGNvbmZpZ3VyZTogKHByb3h5OiBIdHRwUHJveHkuU2VydmVyKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHByb3h5Lm9uKFwiZXJyb3JcIiwgKGVycikgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcIlNvY2tldCBlcnJvciB1c2luZyBvblByb3h5UmVxV3MgZXZlbnRcIiwgZXJyKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0d3M6IHRydWUsXG5cdFx0XHRcdFx0XHRzZWN1cmU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0Y2hhbmdlT3JpZ2luOiB0cnVlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0pO1xuXG5leHBvcnQgZGVmYXVsdCB2aXRlQ29tbW9uQ29uZmlnKHt9KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBLE1BQ0MsTUFBUTtBQUFBLE1BQ1IsU0FBVztBQUFBLE1BQ1gsU0FBVztBQUFBLE1BQ1gsU0FBVztBQUFBLFFBQ1YsS0FBTztBQUFBLFFBQ1AsWUFBWTtBQUFBLFFBQ1osY0FBYztBQUFBLFFBQ2QsY0FBYztBQUFBLFFBQ2QsY0FBYztBQUFBLFFBQ2QsaUJBQWlCO0FBQUEsUUFDakIsZUFBZTtBQUFBLFFBQ2YsaUJBQWlCO0FBQUEsUUFDakIsTUFBUTtBQUFBLFFBQ1IsT0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsTUFDbkI7QUFBQSxNQUNBLGNBQWdCO0FBQUEsUUFDZixrQkFBa0I7QUFBQSxRQUNsQixtQkFBbUI7QUFBQSxRQUNuQix3QkFBd0I7QUFBQSxRQUN4Qix1QkFBdUI7QUFBQSxRQUN2QixpQkFBaUI7QUFBQSxRQUNqQixjQUFjO0FBQUEsUUFDZCxpQkFBaUI7QUFBQSxRQUNqQixvQkFBb0I7QUFBQSxRQUNwQix3QkFBd0I7QUFBQSxR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

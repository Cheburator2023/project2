// vite.config.mts
import child_process from "node:child_process";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { federation } from "file:///Users/synikolaev/smart_anketa_ui/node_modules/@module-federation/vite/lib/index.cjs";
import svgr from "file:///Users/synikolaev/smart_anketa_ui/node_modules/@svgr/rollup/dist/index.js";
import react from "file:///Users/synikolaev/smart_anketa_ui/node_modules/@vitejs/plugin-react/dist/index.mjs";
import browserslistToEsbuild from "file:///Users/synikolaev/smart_anketa_ui/node_modules/browserslist-to-esbuild/src/index.js";
import { defineConfig, loadEnv } from "file:///Users/synikolaev/smart_anketa_ui/node_modules/vite/dist/node/index.js";
import checker from "file:///Users/synikolaev/smart_anketa_ui/apps/react-client/node_modules/vite-plugin-checker/dist/esm/main.js";
import { nodePolyfills } from "file:///Users/synikolaev/smart_anketa_ui/node_modules/vite-plugin-node-polyfills/dist/index.js";
import tsconfigPaths from "file:///Users/synikolaev/smart_anketa_ui/node_modules/vite-tsconfig-paths/dist/index.js";
var __vite_injected_original_dirname = "/Users/synikolaev/smart_anketa_ui/apps/react-client";
var __vite_injected_original_import_meta_url = "file:///Users/synikolaev/smart_anketa_ui/apps/react-client/vite.config.mts";
var APP_NAME = "smartAnketa";
var publicEnvVars = [];
var STAGE = process.env.STAGE;
var IS_DEV = process.env.NODE_ENV === "development";
var NO_ROLES = process.env.NO_ROLES;
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
    // resolve: {
    // 	alias: {
    // 	  '@smart-anketa/api-contract': '../../node_modules/@smart-anketa/api-contract/dist/index.js'
    // 	}
    // },
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
        // biome: {
        // 	dev: {
        // 		logLevel: ["error"],
        // 	},
        // },
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
      ),
      "process.env.NO_ROLES": JSON.stringify(NO_ROLES)
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3N5bmlrb2xhZXYvc21hcnRfYW5rZXRhX3VpL2FwcHMvcmVhY3QtY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvc3luaWtvbGFldi9zbWFydF9hbmtldGFfdWkvYXBwcy9yZWFjdC1jbGllbnQvdml0ZS5jb25maWcubXRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9zeW5pa29sYWV2L3NtYXJ0X2Fua2V0YV91aS9hcHBzL3JlYWN0LWNsaWVudC92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgY2hpbGRfcHJvY2VzcyBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tIFwibm9kZTp1cmxcIjtcblxuaW1wb3J0IHsgZmVkZXJhdGlvbiB9IGZyb20gXCJAbW9kdWxlLWZlZGVyYXRpb24vdml0ZVwiO1xuaW1wb3J0IHN2Z3IgZnJvbSBcIkBzdmdyL3JvbGx1cFwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IGJyb3dzZXJzbGlzdFRvRXNidWlsZCBmcm9tIFwiYnJvd3NlcnNsaXN0LXRvLWVzYnVpbGRcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgdHlwZSBIdHRwUHJveHksIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xuLy8gaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tICd2aXRlLXBsdWdpbi1zdGF0aWMtY29weSc7XG5pbXBvcnQgY2hlY2tlciBmcm9tIFwidml0ZS1wbHVnaW4tY2hlY2tlclwiO1xuaW1wb3J0IHsgbm9kZVBvbHlmaWxscyB9IGZyb20gXCJ2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxsc1wiO1xuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSBcInZpdGUtdHNjb25maWctcGF0aHNcIjtcblxuY29uc3QgQVBQX05BTUUgPSBcInNtYXJ0QW5rZXRhXCI7XG5jb25zdCBwdWJsaWNFbnZWYXJzOiBhbnlbXSA9IFtdO1xuY29uc3QgU1RBR0UgPSBwcm9jZXNzLmVudi5TVEFHRTtcbmNvbnN0IElTX0RFViA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSBcImRldmVsb3BtZW50XCI7XG5jb25zdCBOT19ST0xFUyA9IHByb2Nlc3MuZW52Lk5PX1JPTEVTO1xuXG5jb25zdCBST09UX0RJUiA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9cIik7XG5jb25zdCBESVNUX0RJUiA9IHBhdGgucmVzb2x2ZShST09UX0RJUiwgXCIuL2Rpc3RcIik7XG5cbmNvbnN0IHByb3h5TGlzdCA9IHtcblx0ZGV2OiBcImh0dHBzOi8vZXhhbXBsZS5jb21cIixcbn07XG4vLyBAdHMtaWdub3JlXG5jb25zdCBjdXJyZW50VGFyZ2V0ID0gU1RBR0UgPyBwcm94eUxpc3RbU1RBR0VdIDogcHJveHlMaXN0LmRldjtcblxuY29uc3QgZ2l0X3JldmlzaW9uID0gY2hpbGRfcHJvY2Vzc1xuXHQuZXhlY1N5bmMoJ2dpdCBzaG93IC0tZm9ybWF0PVwic2hvcnRcIiAtcycpXG5cdC50b1N0cmluZygpXG5cdC50cmltKCk7XG5cbmV4cG9ydCBjb25zdCB2aXRlQ29tbW9uQ29uZmlnID0gKHtcblx0YXBwTmFtZSxcblx0YmFzZSA9IFwiL1wiLFxufToge1xuXHRhcHBOYW1lPzogc3RyaW5nO1xuXHRiYXNlPzogc3RyaW5nO1xufSkgPT5cblx0ZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSk6IGFueSA9PiB7XG5cdFx0Y29uc3QgZW52RGlyID0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi5cIiwgaW1wb3J0Lm1ldGEudXJsKSk7XG5cdFx0Y29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBlbnZEaXIsIFwiXCIpO1xuXG5cdFx0Zm9yIChjb25zdCBrZXkgb2YgcHVibGljRW52VmFycykge1xuXHRcdFx0aWYgKCFlbnZba2V5XSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7a2V5fWApO1xuXHRcdFx0fVxuXHRcdFx0cHJvY2Vzcy5lbnZbYCR7a2V5fWBdID0gZW52W2tleV07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGNhY2hlRGlyOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuLy5jYWNoZS92aXRlLWFwcFwiLCBpbXBvcnQubWV0YS51cmwpKSxcblx0XHRcdGJhc2UsXG5cdFx0XHRidWlsZDoge1xuXHRcdFx0XHR0YXJnZXQ6IGJyb3dzZXJzbGlzdFRvRXNidWlsZCgpLFxuXHRcdFx0XHRjb21tb25qc09wdGlvbnM6IHsgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWUgfSxcblx0XHRcdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0XHRcdG91dHB1dDoge1xuXHRcdFx0XHRcdFx0ZGlyOiBESVNUX0RJUixcblx0XHRcdFx0XHRcdHN0cmljdDogZmFsc2UsXG5cdFx0XHRcdFx0XHRlbnRyeUZpbGVOYW1lczogXCJbbmFtZV0uanNcIixcblx0XHRcdFx0XHRcdG1hbnVhbENodW5rczoge1xuXHRcdFx0XHRcdFx0XHRyZWFjdDogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXItZG9tXCJdLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblxuXHRcdFx0Ly8gcmVzb2x2ZToge1xuXHRcdFx0Ly8gXHRhbGlhczoge1xuXHRcdFx0Ly8gXHQgICdAc21hcnQtYW5rZXRhL2FwaS1jb250cmFjdCc6ICcuLi8uLi9ub2RlX21vZHVsZXMvQHNtYXJ0LWFua2V0YS9hcGktY29udHJhY3QvZGlzdC9pbmRleC5qcydcblx0XHRcdC8vIFx0fVxuXHRcdFx0Ly8gfSxcblxuXG5cdFx0XHRwbHVnaW5zOiBbXG5cdFx0XHRcdC8vIHtcblx0XHRcdFx0Ly8gICBuYW1lOiAnZGVlcC1pbmRleCcsXG5cdFx0XHRcdC8vICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuXHRcdFx0XHQvLyAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcblx0XHRcdFx0Ly8gICAgICAgaWYgKHJlcS51cmwgPT09ICcvJykge1xuXHRcdFx0XHQvLyAgICAgICAgIHJlcS51cmwgPSAnL3B1YmxpYy9pbmRleC5odG1sJztcblx0XHRcdFx0Ly8gICAgICAgfVxuXHRcdFx0XHQvLyAgICAgICBuZXh0KCk7XG5cdFx0XHRcdC8vICAgICB9KTtcblx0XHRcdFx0Ly8gICB9LFxuXHRcdFx0XHQvLyB9LFxuXHRcdFx0XHQuLi4oIUlTX0RFVlxuXHRcdFx0XHRcdD8gW1xuXHRcdFx0XHRcdFx0XHRmZWRlcmF0aW9uKHtcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBBUFBfTkFNRSxcblx0XHRcdFx0XHRcdFx0XHRmaWxlbmFtZTogXCJyZW1vdGVFbnRyeS5qc1wiLFxuXHRcdFx0XHRcdFx0XHRcdGV4cG9zZXM6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFwiLi9BcHBcIjogXCIuL3NyYy9pbmRleEZlZGVyYXRlZFwiLFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0c2hhcmVkOiBbXSxcblx0XHRcdFx0XHRcdFx0fSksXG5cdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0OiBbXSksXG5cdFx0XHRcdHRzY29uZmlnUGF0aHMoKSxcblx0XHRcdFx0bm9kZVBvbHlmaWxscyh7XG5cdFx0XHRcdFx0Ly8gVG8gYWRkIG9ubHkgc3BlY2lmaWMgcG9seWZpbGxzLCBhZGQgdGhlbSBoZXJlLiBJZiBubyBvcHRpb24gaXMgcGFzc2VkLCBhZGRzIGFsbCBwb2x5ZmlsbHNcblx0XHRcdFx0XHRpbmNsdWRlOiBbXCJuZXRcIl0sXG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRyZWFjdCgpLFxuXHRcdFx0XHRzdmdyKHtcblx0XHRcdFx0XHRkaW1lbnNpb25zOiBmYWxzZSxcblx0XHRcdFx0XHRzdmdQcm9wczoge1xuXHRcdFx0XHRcdFx0Zm9jdXNhYmxlOiBcIntmYWxzZX1cIixcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KSxcblx0XHRcdFx0Ly8gdml0ZVN0YXRpY0NvcHkoe1xuXHRcdFx0XHQvLyAgIHRhcmdldHM6IFt7fV0sXG5cdFx0XHRcdC8vIH0pLFxuXHRcdFx0XHRjaGVja2VyKHtcblx0XHRcdFx0XHQvLyBiaW9tZToge1xuXHRcdFx0XHRcdC8vIFx0ZGV2OiB7XG5cdFx0XHRcdFx0Ly8gXHRcdGxvZ0xldmVsOiBbXCJlcnJvclwiXSxcblx0XHRcdFx0XHQvLyBcdH0sXG5cdFx0XHRcdFx0Ly8gfSxcblx0XHRcdFx0XHR0eXBlc2NyaXB0OiB0cnVlLFxuXHRcdFx0XHRcdG92ZXJsYXk6IHtcblx0XHRcdFx0XHRcdGluaXRpYWxJc09wZW46IGZhbHNlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pLFxuXHRcdFx0XSxcblxuXHRcdFx0ZGVmaW5lOiB7XG5cdFx0XHRcdFwicHJvY2Vzcy5lbnYuTU9DS0VEX1JFUVVFU1RTXCI6IEpTT04uc3RyaW5naWZ5KFxuXHRcdFx0XHRcdHByb2Nlc3MuZW52Lk1PQ0tFRF9SRVFVRVNUUyxcblx0XHRcdFx0KSxcblx0XHRcdFx0XCJwcm9jZXNzLmVudi5HSVRfUkVWSVNJT05cIjogSlNPTi5zdHJpbmdpZnkoZ2l0X3JldmlzaW9uKSxcblx0XHRcdFx0XCJwcm9jZXNzLmVudi5BUFBfTkFNRVwiOiBKU09OLnN0cmluZ2lmeShBUFBfTkFNRSksXG5cdFx0XHRcdFwicHJvY2Vzcy5lbnYuUkVBQ1RfQVBQX0FQSV9VUkxcIjogSlNPTi5zdHJpbmdpZnkoXG5cdFx0XHRcdFx0XCJodHRwOi8vbG9jYWxob3N0OjMwMDBcIixcblx0XHRcdFx0KSxcblx0XHRcdFx0XCJwcm9jZXNzLmVudi5OT19ST0xFU1wiOiBKU09OLnN0cmluZ2lmeShOT19ST0xFUyksXG5cdFx0XHR9LFxuXG5cdFx0XHQvLyByZXNvbHZlOiB7XG5cdFx0XHQvLyAgIGFsaWFzOiBbXG5cdFx0XHQvLyAgICAgLy8gcGFja2FnZXNcblx0XHRcdC8vICAgICB7XG5cdFx0XHQvLyAgICAgICBmaW5kOiAndHlwZXMnLFxuXHRcdFx0Ly8gICAgICAgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZSgnLi90eXBlcycpLFxuXHRcdFx0Ly8gICAgIH0sXG5cdFx0XHQvLyAgIF0sXG5cdFx0XHQvLyB9LFxuXG5cdFx0XHRzZXJ2ZXI6IHtcblx0XHRcdFx0Ly8gaG9zdDogXCJ3d3cudGVzdC52dGIucnVcIixcblx0XHRcdFx0ZnM6IHtcblx0XHRcdFx0XHRzdHJpY3Q6IGZhbHNlLFxuXHRcdFx0XHRcdGNhY2hlZENoZWNrczogZmFsc2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHBvcnQ6IDgwMDQsXG5cdFx0XHRcdHByb3h5OiB7XG5cdFx0XHRcdFx0XCIvYXBpXCI6IHtcblx0XHRcdFx0XHRcdHRhcmdldDogY3VycmVudFRhcmdldCxcblx0XHRcdFx0XHRcdHNlY3VyZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRyZXdyaXRlKF9wYXRoOiBzdHJpbmcpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIF9wYXRoLnJlcGxhY2UoL15cXC9hcGkvLCBcIlwiKTtcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRjaGFuZ2VPcmlnaW46IHRydWUsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHQvLyBQcm94eWluZyB3ZWJzb2NrZXRzXG5cdFx0XHRcdFx0XCIvc29ja2V0XCI6IHtcblx0XHRcdFx0XHRcdHRhcmdldDogY3VycmVudFRhcmdldCxcblx0XHRcdFx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XHRcdFx0T3JpZ2luOiBjdXJyZW50VGFyZ2V0LFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdHJld3JpdGUoX3BhdGg6IHN0cmluZykge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gX3BhdGgucmVwbGFjZSgvXlxcL3NvY2tldC8sIFwiXCIpO1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGNvbmZpZ3VyZTogKHByb3h5OiBIdHRwUHJveHkuU2VydmVyKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHByb3h5Lm9uKFwiZXJyb3JcIiwgKGVycikgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcIlNvY2tldCBlcnJvciB1c2luZyBvblByb3h5UmVxV3MgZXZlbnRcIiwgZXJyKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0d3M6IHRydWUsXG5cdFx0XHRcdFx0XHRzZWN1cmU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0Y2hhbmdlT3JpZ2luOiB0cnVlLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0pO1xuXG5leHBvcnQgZGVmYXVsdCB2aXRlQ29tbW9uQ29uZmlnKHt9KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlUsT0FBTyxtQkFBbUI7QUFDdlcsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZUFBZSxXQUFXO0FBRW5DLFNBQVMsa0JBQWtCO0FBQzNCLE9BQU8sVUFBVTtBQUNqQixPQUFPLFdBQVc7QUFDbEIsT0FBTywyQkFBMkI7QUFDbEMsU0FBUyxjQUE4QixlQUFlO0FBRXRELE9BQU8sYUFBYTtBQUNwQixTQUFTLHFCQUFxQjtBQUM5QixPQUFPLG1CQUFtQjtBQVoxQixJQUFNLG1DQUFtQztBQUFzSyxJQUFNLDJDQUEyQztBQWNoUSxJQUFNLFdBQVc7QUFDakIsSUFBTSxnQkFBdUIsQ0FBQztBQUM5QixJQUFNLFFBQVEsUUFBUSxJQUFJO0FBQzFCLElBQU0sU0FBUyxRQUFRLElBQUksYUFBYTtBQUN4QyxJQUFNLFdBQVcsUUFBUSxJQUFJO0FBRTdCLElBQU0sV0FBVyxLQUFLLFFB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

import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/accessrevamp-client.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function AccessRevampClient() {
	(0, import_react.useEffect)(() => {
		import("./main-Bwzt-wX3.js");
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			className: "skip-link",
			href: "#main-content",
			children: "Skip to content"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { id: "app" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("noscript", { children: "This site needs JavaScript for navigation and interactive features." })
	] });
}
//#endregion
export { AccessRevampClient };

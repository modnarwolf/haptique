import { createRoot } from "react-dom/client";
import { jsx } from "react/jsx-runtime";
import "dialkit/styles.css";
import "./app.css";
import { HaptiqueApp } from "./ui/haptique-app.js";

createRoot(document.getElementById("root")).render(jsx(HaptiqueApp, {}));

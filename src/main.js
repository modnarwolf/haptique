import { createRoot } from "react-dom/client";
import { createElement } from "react";
import "dialkit/styles.css";
import "./new-app.css";
import { HaptiqueApp } from "./ui/new-app.jsx";

createRoot(document.getElementById("root")).render(createElement(HaptiqueApp));

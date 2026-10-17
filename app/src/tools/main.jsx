import React from "react";
import { createRoot } from "react-dom/client";
import ToolsPage from "./ToolsPage.jsx";
import "../styles.css";
import "./tools.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToolsPage />
  </React.StrictMode>,
);

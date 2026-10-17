import React from "react";
import { createRoot } from "react-dom/client";
import ArcadeMap from "./ArcadeMap.jsx";
import "../styles.css";
import "./arcade-map.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ArcadeMap />
  </React.StrictMode>,
);
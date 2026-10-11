import React from "react";
import { createRoot } from "react-dom/client";
import { AlsacePage } from "./AlsacePage.jsx";
import "./styles.css";
import "./alsace.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AlsacePage />
  </React.StrictMode>,
);

import React from "react";
import { createRoot } from "react-dom/client";
import { PackingPage } from "./PackingPage.jsx";
import "./styles.css";
import "./packing.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PackingPage />
  </React.StrictMode>,
);

import React from "react";
import { createRoot } from "react-dom/client";
import { PrivateItineraryPage } from "./PrivateItineraryPage.jsx";
import "./styles.css";
import "./private-itinerary.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PrivateItineraryPage />
  </React.StrictMode>,
);

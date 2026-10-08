import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LicenseGate, { needsLicense } from "./LicenseGate";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {needsLicense() ? (
      <LicenseGate>
        <App />
      </LicenseGate>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

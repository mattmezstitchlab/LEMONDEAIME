import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./design/pointzero.css";
import App from "./App";
import StorageRecoveryNotice from "./components/StorageRecoveryNotice";
import AccessibilityShell from "./components/AccessibilityShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AccessibilityShell><StorageRecoveryNotice/><App /></AccessibilityShell>
  </StrictMode>
);

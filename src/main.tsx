import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initWebVitals } from "@/lib/web-vitals";
import { registerServiceWorker } from "@/lib/register-sw";

// Start collecting Web Vitals before the React tree mounts
initWebVitals();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

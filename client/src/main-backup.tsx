import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add error handling for debugging
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

console.log("Main.tsx loaded, creating root...");

try {
  const root = createRoot(rootElement);
  console.log("Root created, rendering App...");
  root.render(<App />);
  console.log("App rendered successfully");
} catch (error) {
  console.error("Error rendering app:", error);
  // Fallback rendering
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial;">
      <h1>Loading Error</h1>
      <p>Error: ${error.message}</p>
      <p>Please check the console for more details.</p>
    </div>
  `;
}
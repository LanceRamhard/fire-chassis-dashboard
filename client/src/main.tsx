import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply saved theme before first render to prevent flash
(function () {
  const saved = localStorage.getItem("vipr-theme");
  document.documentElement.setAttribute("data-theme", saved === "light" ? "light" : "dark");
})();

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(<App />);

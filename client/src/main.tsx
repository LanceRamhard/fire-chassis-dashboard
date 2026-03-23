import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply theme before first render to prevent flash.
// Priority: 1) user's saved choice  2) OS preference
(function () {
  const saved = localStorage.getItem("vipr-theme");
  const osPrefers = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", (saved === "light" || saved === "dark") ? saved : osPrefers);
})();

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(<App />);

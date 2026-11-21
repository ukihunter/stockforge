import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./App.css";
import { Toaster } from "./components/ui/sonner";

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
  <App />

  <Toaster
    position="bottom-right"
    duration={3500}
    richColors
    closeButton
  />
</React.StrictMode>,
);

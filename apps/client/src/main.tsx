import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider";
import App from "./App";
import "./style.css";
import { TrainerProvider } from "./context/TrainerContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <TrainerProvider>
                    <App />
                </TrainerProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
);

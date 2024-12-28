import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserPage from "./pages/UserPage";
import LoadingPage from "./pages/LoadingPage";
import SuccessPage from "./pages/SuccessPage";
import DJConsole from "./pages/DJconsole";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserPage />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/DJconsole" element={<DJConsole />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
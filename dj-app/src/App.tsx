import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserPage from "./pages/UserPage";
import DJConsole from "./pages/DJconsole";
import RequestDetailPage from "./pages/RequestDetailPage";
import Help from "./pages/Help";
import LoginPage from "./pages/LoginPage";



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserPage />} />
        <Route path="UserPage/" element={<UserPage />} />
        <Route path="/DJconsole" element={<DJConsole />} />
        <Route path="/Help" element={<Help />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/requests/:requestId" element={<RequestDetailPage />} />
      </Routes>

    </BrowserRouter>
  );
}

export default App;
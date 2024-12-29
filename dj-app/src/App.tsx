import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserPage from "./pages/UserPage";
import DJConsole from "./pages/DJconsole";
import RequestDetailPage from "./pages/RequestDEtailPage";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserPage />} />
        <Route path="UserPage/" element={<UserPage />} />
        <Route path="/DJconsole" element={<DJConsole />} />
        <Route path="/requests/:requestId" element={<RequestDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
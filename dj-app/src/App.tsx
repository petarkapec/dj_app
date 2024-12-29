import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserPage from "./pages/UserPage";
import DJConsole from "./pages/DJconsole";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserPage />} />
        <Route path="UserPage/" element={<UserPage />} />
        <Route path="/DJconsole" element={<DJConsole />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
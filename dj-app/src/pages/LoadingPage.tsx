import React from "react";
import { useNavigate } from "react-router-dom";

const LoadingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Izvođač trenutno pregledava tvoj zahtjev...</h1>
      <div className="spinner" style={{ margin: "20px" }}>
        {/* Animacija */}
        <div style={{ border: "8px solid #f3f3f3", borderRadius: "50%", borderTop: "8px solid #3498db", width: "50px", height: "50px", animation: "spin 2s linear infinite" }} />
      </div>
      <button onClick={() => navigate("/")}>Prekini zahtjev</button>
    </div>
  );
};

export default LoadingPage;

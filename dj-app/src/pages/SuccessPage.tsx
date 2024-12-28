import React from "react";
import { useNavigate } from "react-router-dom";

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Success!</h1>
      <p>DJ će pustiti tvoju pjesmu.</p>
      <button onClick={() => navigate("/")}>Vrati se na početnu</button>
    </div>
  );
};

export default SuccessPage;

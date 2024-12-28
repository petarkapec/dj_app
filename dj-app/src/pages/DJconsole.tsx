import React, { useEffect, useState } from "react"; 
import { Navigate } from "react-router-dom";
import axios from "axios";

interface Request {
  id: number;
  donation: string;
  song?: { title: string; videoId: string }; // Polje song ostaje isto
  comment: string;
  status: string;
}

const handleLogout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};

const DJConsole = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  const [requests, setRequests] = useState<Request[]>([]);

  // Dohvaćanje zahtjeva
  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/requests`);
      setRequests(res.data);
      console.log("Dohvaćeni zahtjevi:", res.data);
    } catch (error) {
      console.error("Greška kod dohvaćanja zahtjeva:", error);
    }
  };

  // Prihvati zahtjev
  const acceptRequest = async (id: number) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/accept-request`, { id });
      fetchRequests(); // Osvježi listu zahtjeva
    } catch (error) {
      console.error("Greška kod prihvaćanja zahtjeva:", error);
    }
  };

  // Odbij zahtjev
  const rejectRequest = async (id: number) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/reject-request`, { id });
      fetchRequests(); // Osvježi listu zahtjeva
    } catch (error) {
      console.error("Greška kod odbijanja zahtjeva:", error);
    }
  };

  // WebSocket konekcija za real-time ažuriranja
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socket.onopen = () => {
      console.log("Povezani na WebSocket server");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Primljena poruka putem WebSocket-a:", data);

      // Ažuriraj listu zahtjeva prema dolaznim podacima
      setRequests((prevRequests) => {
        const existingRequest = prevRequests.find((r) => r.id === data.id);
      
        if (existingRequest) {
          // Ažuriraj postojeći zahtjev i spoji podatke
          return prevRequests.map((r) =>
            r.id === data.id
              ? {
                  ...r,
                  ...data, // Spoji nove podatke iz `data` s postojećima
                }
              : r
          );
        } else {
          // Dodaj novi zahtjev s podrazumijevanim vrijednostima
          fetchRequests();
          return [
            ...prevRequests
          ];
        }
      });
      
    };

    socket.onclose = () => {
      console.log("WebSocket konekcija zatvorena");
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div>
      <h1>DJ Zahtjevi</h1>
      {requests.map((r) => (
        <div
          key={r.id}
          style={{
            marginBottom: "1rem",
            border: "1px solid #ccc",
            padding: "1rem",
          }}
        >
          <p>
            <b>Pjesma:</b> {r.song_title || "Nepoznata"} | <b>Donacija:</b> {r.donation}€
          </p>
          <p>
            <b>Komentar:</b> {r.comment}
          </p>
          {r.status === "paid" ? (
            <span style={{ color: "green" }}>Plaćeno ✅</span>
          ) : (
            <div>
              {r.status === "pending" && (
                <>
                  <button onClick={() => acceptRequest(r.id)}>Prihvati</button>
                  <button onClick={() => rejectRequest(r.id)}>Odbij</button>
                </>
              )}
              {r.status === "awaiting_payment" && (
                <span style={{ color: "orange" }}>
                  Čeka se potvrda plaćanja od kupca ⏳
                </span>
              )}
            </div>
          )}
        </div>
      ))}
      <div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default DJConsole;

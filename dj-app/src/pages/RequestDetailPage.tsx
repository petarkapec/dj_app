import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./RequestDetailPage.css";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const wsUrl = import.meta.env.VITE_WS_URL;

const RequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const [request, setRequest] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const response = await axios.get(`${backendUrl}/requests/${requestId}`);
        setRequest(response.data);
      } catch (error) {
        console.error("Greška kod dohvata detalja zahtjeva:", error);
      }
    };

    fetchRequestDetails();

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket povezan za korisnika");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("reaktivan sam samo jedes govna", data);

      // Ažuriraj status ako je obavijest za trenutni zahtjev
      fetchRequestDetails();
    };

    ws.onclose = () => {
      console.log("WebSocket zatvoren");
    };

    ws.onerror = (error) => {
      console.error("WebSocket greška:", error);
    };

    return () => {
      ws.close();
    };
  }, [requestId]);

  const cancelRequest = async () => {
    try {
      await axios.delete(`${backendUrl}/cancel-request`, { data: { requestId } });
      alert("Zahtjev je uspješno prekinut.");
      navigate("/"); // Vrati korisnika na početnu stranicu
    } catch (error) {
      console.error("Greška pri prekidu zahtjeva:", error);
      alert("Došlo je do greške pri prekidu zahtjeva.");
    }
  };

  if (!request) {
    return <div>Učitavanje detalja zahtjeva...</div>;
  }

  return (
    <div>
    <div className="load-screen">
        <div>
        
      <h2>Detalji zahtjeva</h2>
      <p><b>Pjesma:</b> {request.song_title}</p>
      <p><b>Status:</b> {request.status}</p>
      <p><b>Komentar:</b> {request.comment}</p>
      <p><b>Donacija:</b> {request.donation} EUR</p>
      </div>
      {request.status === "pending" && (
        <div className="load-screen2">
            <div className="loadersubmit">
            </div>
                Pričekajte da DJ prihvati vašu narudžbu...
        </div>
      )}
      
      {request.status === "awaiting_payment" && (
        <button className="pay-button" onClick={() => window.open(request.payment_url, "blank")}>
          Plati
        </button>
      )}
      {request.status === "awaiting_payment" && (
        <button className="cancel-button" onClick={cancelRequest}>
          Prekini
        </button>
      )}

      <button onClick={() => navigate("/")}>Povratak</button>
    </div>
    </div>
  );
};

export default RequestDetailPage;

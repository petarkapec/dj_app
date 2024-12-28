import React, { useEffect, useState } from "react";
import axios from "axios";
import "./UserPage.css";

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const wsUrl = import.meta.env.VITE_WS_URL; // URL za WebSocket (npr. ws://localhost:3001)

const UserPage: React.FC = () => {
  const [donation, setDonation] = useState(""); // Polje za donaciju
  const [songQuery, setSongQuery] = useState(""); // Polje za upit
  const [comment, setComment] = useState(""); // Dodatni komentar
  const [searchResults, setSearchResults] = useState<any[]>([]); // Rezultati pretraživanja
  const [selectedSong, setSelectedSong] = useState<any>(null); // Odabrana pjesma
  const [status, setStatus] = useState<"idle" | "loading" | "submitted" | "error">("idle");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null); // Stripe URL
  const [userRequests, setUserRequests] = useState<any[]>([]); // Povijest zahtjeva
  const clientId = localStorage.getItem("clientId") || generateClientId();

  // Generiraj i spremi jedinstveni identifikator
  function generateClientId() {
    const newClientId = `client_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("clientId", newClientId);
    return newClientId;
  }

  // Dohvati povijest zahtjeva
  const fetchUserRequests = async () => {
    if (!clientId) {
      console.error("clientId nije definisan!");
      return;
    }

    try {
      const response = await axios.get(`${backendUrl}/user-requests`, {
        params: { clientId },
      });
      setUserRequests(response.data);
    } catch (error) {
      console.error("Greška kod dohvaćanja zahtjeva:", error);
    }
  };

  // Povezivanje na WebSocket
  useEffect(() => {
    const ws = new WebSocket(`${wsUrl}?clientId=${clientId}`);

    ws.onopen = () => {
      console.log("WebSocket povezan za korisnika:", clientId);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Ažuriranje statusa zahtjeva u stvarnom vremenu
      if (data.type === "status_update" && data.clientId === clientId) {
        setUserRequests((prevRequests) =>
          prevRequests.map((req) =>
            req.id === data.requestId ? { ...req, status: data.status } : req
          )
        );

        // Ako je korisnik trenutno čeka Stripe URL, ažuriraj ga
        if (data.status === "awaiting_payment" && data.paymentUrl) {
          setPaymentUrl(data.paymentUrl);
        }
      }
    };

    ws.onclose = () => {
      console.log("WebSocket zatvoren za korisnika:", clientId);
    };

    ws.onerror = (error) => {
      console.error("WebSocket greška:", error);
    };

    return () => {
      ws.close();
    };
  }, [clientId]);

  // Pretraživanje YouTube pjesama
  const searchYouTube = async () => {
    if (!songQuery) return;

    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: "snippet",
          maxResults: 5,
          q: songQuery,
          type: "video",
          key: YOUTUBE_API_KEY,
        },
      });

      setSearchResults(response.data.items); // Postavi rezultate pretraživanja
      setSelectedSong(null); // Resetiraj prethodno odabranu pjesmu
    } catch (error) {
      console.error("Greška kod pretraživanja YouTube API-ja:", error);
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const response = await axios.delete(`${backendUrl}/cancel-request`, {
        data: { clientId, requestId },
      });
  
      if (response.status === 200) {
        // Uspješno obrisano, ažuriraj prikaz zahtjeva
        setUserRequests((prevRequests) =>
          prevRequests.filter((req) => req.id !== requestId)
        );
        alert("Zahtjev je uspješno prekinut.");
      } else {
        throw new Error("Zahtjev nije uspješno prekinut.");
      }
    } catch (error) {
      console.error("Greška pri prekidu zahtjeva:", error);
      alert("Došlo je do greške pri prekidu zahtjeva.");
    }
  };
  




  // Slanje zahtjeva
  const handleSubmit = async () => {
    if (!donation || !selectedSong) {
      alert("Molimo unesite donaciju i odaberite pjesmu!");
      return;
    }
  
    const requestData = {
      clientId,
      donation,
      song: {
        title: selectedSong.snippet.title,
        videoId: selectedSong.id.videoId,
      },
      comment
    };
  
    try {
      setStatus("loading");
      const response = await axios.post(`${backendUrl}/request`, requestData);
  
      if (response.status === 200) {
        setStatus("submitted");
        setPaymentUrl(response.data.paymentUrl); // Postavi payment URL
        fetchUserRequests(); // Osvježi listu zahtjeva
      } else {
        throw new Error("Zahtjev nije uspješno poslan");
      }
    } catch (error) {
      console.error("Greška:", error);
      setStatus("error");
    }
  };
  

  useEffect(() => {
    fetchUserRequests(); // Dohvati povijest zahtjeva na učitavanje stranice
  }, []);

  return (
    <div className="container">
      <h1>Pošalji zahtjev DJ-u</h1>

      {/* Polje za donaciju */}
      <div className="form-group">
        <label>Prijedlog donacije:</label>
        <input
          type="number"
          value={donation}
          onChange={(e) => setDonation(e.target.value)}
          placeholder="Unesi iznos u eurima"
        />
      </div>

      {/* Polje za pretraživanje pjesme */}
      <div className="form-group">
        <label>Pretraži pjesmu:</label>
        <div className="search-container">
          <input
            type="text"
            value={songQuery}
            onChange={(e) => setSongQuery(e.target.value)}
            placeholder="Unesi naziv pjesme"
          />
          <button onClick={searchYouTube}>Pretraži</button>
        </div>
      </div>

      {/* Prikaz rezultata pretraživanja */}
      <div className="results">
        {searchResults.map((video) => (
          <div
            key={video.id.videoId}
            className={`result-item ${
              selectedSong?.id.videoId === video.id.videoId ? "selected" : ""
            }`}
          >
            <img src={video.snippet.thumbnails.default.url} alt={video.snippet.title} />
            <div className="song-info">
              <p>{video.snippet.title}</p>
              <button onClick={() => setSelectedSong(video)}>
                {selectedSong?.id.videoId === video.id.videoId ? "Odabrano" : "Odaberi"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Polje za dodatni komentar */}
      <div className="form-group">
        <label>Dodatni komentar (opcionalno):</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Poruka DJ-u"
        />
      </div>

      {/* Status i gumbovi */}
      <div className="status-messages">
        {status === "loading" && <p>Loading...</p>}
        {status === "submitted" && !paymentUrl && <p>Request submitted. Waiting for approval...</p>}
        {status === "submitted" && paymentUrl && (
          <button className="send-button" onClick={() => window.open(paymentUrl, "_blank")}>
            Plati
          </button>
        )}
        {status === "error" && <p>There was an error. Try again later.</p>}
      </div>

      <button className="send-button" onClick={handleSubmit}>
        Pošalji zahtjev
      </button>


      

      {/* Prikaz povijesti zahtjeva */}
      <h2>Tvoji zahtjevi</h2>
      <div className="user-requests">
        {userRequests.map((r) => (
            <div key={r.id} className="request-item">
            <p>
                <b>Pjesma:</b> {r.song_title ?? "Nepoznata"} | <b>Status:</b> {r.status}
            </p>
            {/* Gumbi za akcije */}
            <div className="request-actions">
                {r.status === "awaiting_payment" && (
                <button
                    className="pay-button"
                    onClick={() => window.open(r.payment_url, "blank")}
                >
                    Plati
                </button>
                )}
                {r.status === "awaiting_payment" && (
                <button
                    className="cancel-button"
                    onClick={() => cancelRequest(r.id)}
                >
                    Prekini
                </button>
                )}
            </div>
            </div>
        ))}
        </div>

      
    </div>
  );
};


export default UserPage;

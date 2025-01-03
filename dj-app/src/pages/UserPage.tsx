import React, { useEffect, useState } from "react";
import axios from "axios";
import "./UserPage.css";
import { useNavigate } from "react-router-dom";
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const wsUrl = import.meta.env.VITE_WS_URL;

const UserPage: React.FC = () => {
  const [donation, setDonation] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [comment, setComment] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "submitted" | "error">("idle");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const clientId = localStorage.getItem("clientId") || generateClientId();
  const navigate = useNavigate();
  

  function generateClientId() {
    const newClientId = `client_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("clientId", newClientId);
    return newClientId;
  }

  const fetchUserIds = async () => {
    if (!clientId) {
      console.error("clientId nije definisan!");
      return [];
    }
    try {
      const response = await axios.get(`${backendUrl}/user-ids`, {
        params: { clientId },
      });
      const usedIds = response.data.map((item: any) => item.id);

      console.log("Iskorišteni ID-evi:", usedIds);
      return usedIds;
    
    } catch (error) {
      console.error("Greška kod dohvaćanja zahtjeva:", error);
      return [];
    }

  }



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

  useEffect(() => {
    const ws = new WebSocket(`${wsUrl}?clientId=${clientId}`);

    ws.onopen = () => {
      console.log("WebSocket povezan za korisnika:", clientId);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      fetchUserRequests();
      if (data.type === "status_update" && data.clientId === clientId) {
        setUserRequests((prevRequests) =>
          prevRequests.map((req) =>
            req.id === data.requestId ? { ...req, status: data.status } : req
          )
        );

        if (data.status === "awaiting_payment" && data.paymentUrl) {
          setPaymentUrl(data.paymentUrl);
        }

        if (data.status === "rejected") {
          alert("DJ je izbrisao tvoj zahtjev");
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

  const searchYouTube = async () => {
    if (!songQuery) return;

    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: "snippet",
          maxResults: 5,
          q: songQuery,
          type: "video",
          videoCategoryId: 10, // Glazba
          
          key: YOUTUBE_API_KEY,
        },
      });

      setSearchResults(response.data.items);
      setSelectedSong(null);
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

  const handleSubmit = async () => {
    if (!donation || !selectedSong) {
      alert("Molimo unesite donaciju i odaberite pjesmu!");
      return;
    }

    let userids = await fetchUserIds();
    let noviId = 1;
    console.log(userids);

    if (userids.length === 0) { // Provjerava je li lista prazna
      noviId = 1;
    } else {
      userids.sort((a: number, b: number) => b - a);
      noviId = userids[0] + 1;
      while (userids.includes(noviId)) { // Ispravljen način provjere prisutnosti
        noviId++;
      }
    }
    console.log(status);
    console.log(paymentUrl);

  
    const requestData = {
      clientId,
      donation,
      song: {
        title: selectedSong.snippet.title,
        videoId: selectedSong.id.videoId,
      },
      comment,
      noviId
    };
    console.log(noviId);

    try {
      setStatus("loading");
      const response = await axios.post(`${backendUrl}/request`, requestData);

      if (response.status === 200) {
        setStatus("submitted");
        setPaymentUrl(response.data.paymentUrl); // Postavi payment URL
        fetchUserRequests(); // Osvježi listu zahtjeva
        navigate(`/requests/${noviId}`)
        
      } else {
        throw new Error("Zahtjev nije uspješno poslan");
      }
    } catch (error) {
      console.error("Greška:", error);
      setStatus("error");
    }
    
  };

  const sortedUserRequests = [...userRequests].sort((a, b) => {
    const statusOrder = ["pending", "awaiting_payment", "paid"];
    const statusComparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (statusComparison !== 0) return statusComparison;

    // Ako je status isti, sortiraj po ID-u (noviji requestovi imaju veći ID)
    return b.id - a.id;
  });

  useEffect(() => {
    fetchUserRequests();
  }, []);

  return (
    <div className="container">
      <h1 className="title">
        <img src="public/feta-logo.jpg" alt="FETA Logo" className="title-icon" />
        FETA
      </h1>
      <h2>Pošalji zahtjev DJ-u</h2>

      <div className="form-group">
        <label>Prijedlog donacije:</label>
        <input
          type="number"
          value={donation}
          onChange={(e) => setDonation(e.target.value)}
          placeholder="Unesi iznos u eurima"
        />
      </div>

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

      <div className="results">
        {searchResults.map((video) => (
          <div
            key={video.id.videoId}
            className={`result-item ${
              selectedSong?.id.videoId === video.id.videoId ? "selected" : ""
            }`}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px" }}
          >
            <img src={video.snippet.thumbnails.default.url} alt={video.snippet.title} style={{ width: "50px", height: "50px", borderRadius: "5px" }} />
            <p style={{ fontSize: "0.8rem", margin: "0 10px", flex: "1" }}>{video.snippet.title}</p>
            <button style={{ fontSize: "0.7rem", padding: "5px" }} onClick={() => setSelectedSong(video)}>
              {selectedSong?.id.videoId === video.id.videoId ? "Odabrano" : "Odaberi"}
            </button>
          </div>
        ))}
      </div>

      <div className="form-group">
        <label>Dodatni komentar (opcionalno):</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Poruka DJ-u"
        />
      </div>

      <button className="send-button" onClick={handleSubmit}>
        Pošalji zahtjev
      </button>

      <h2>Tvoji zahtjevi</h2>
      <div className="user-requests">
        {sortedUserRequests.map((r) => (
          <div key={r.id} className="request-item">
            <p>
              <b>Pjesma:</b> {r.song_title ?? "Nepoznata"} | <b>Status:</b> {r.status}
            </p>
            <div className="request-actions">
              <button onClick={() => navigate(`/requests/${r.id}`)}>Detalji</button>
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
        <div>
          <button onClick={() => navigate(`/Help`)}>Detalji</button>
        </div>

      
    </div>
  );
};

export default UserPage;

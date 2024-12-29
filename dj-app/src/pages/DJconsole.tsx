import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import "./DJconsole.css";
import YouTubeThumbnail from "./YouTubeThumbnail";


interface Request {
  id: number;
  donation: string;
  song?: { title: string; videoId: string };
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

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/requests`);
      setRequests(res.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const acceptRequest = async (id: number) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/accept-request`, { id });
      fetchRequests();
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const rejectRequest = async (id: number) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/reject-request`, { id });
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socket.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setRequests((prevRequests) => {
        const existingRequest = prevRequests.find((r) => r.id === data.id);

        if (existingRequest) {
          return prevRequests.map((r) =>
            r.id === data.id ? { ...r, ...data } : r
          );
        } else {
          fetchRequests();
          return [...prevRequests];
        }
      });
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="dj-console">
      <h1 className="title">DJ Requests</h1>
      {requests.map((r) => (
        <div className="request-card" key={r.id}>
          <div>
            <YouTubeThumbnail songVideoId={r.song_video_id} />
          </div>
          <p>
            <b>Song:</b> {r.song_title || "Unknown"} | <b>Donation:</b> {r.donation}€
          </p>
          <p>
            <b>Comment:</b> {r.comment}
          </p>
          {r.status === "paid" ? (
            <span className="status-paid">Paid ✅</span>
          ) : (
            <div>
              {r.status === "pending" && (
                <>
                  <button
                    className="btn btn-accept"
                    onClick={() => acceptRequest(r.id)}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => rejectRequest(r.id)}
                  >
                    Reject
                  </button>
                </>
              )}
              {r.status === "awaiting_payment" && (
                <span className="loader"> payment</span>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="logout-container">
        <button className="btn btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default DJConsole;

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const Stripe = require("stripe");
const WebSocket = require("ws");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


app.use((req, res, next) => {
  if (req.path === "/stripe-webhook") {
    next(); // Preskoči globalni parser za ovu rutu
  } else {
    express.json()(req, res, next); // Parsiraj JSON za sve ostale rute
  }
});


// Konfiguracija PostgreSQL veze
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Konfiguracija portova
const API_PORT = process.env.PORT || 5000;
const WS_PORT_DJ = process.env.WS_PORT_DJ || 3001;
const WS_PORT_USER = process.env.WS_PORT_USER || 3002;

const JWT_SECRET = process.env.JWT_SECRET;

// Express middleware
app.use(cors());



// WebSocket serveri
const wssDJ = new WebSocket.Server({ port: WS_PORT_DJ });
const wssUser = new WebSocket.Server({ port: WS_PORT_USER });

const djClients = new Set();
const userClients = new Set();

function notifyDJClients(message) {
  djClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function notifyUserClients(message) {
  userClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

wssDJ.on("connection", (ws) => {
  console.log("DJ povezan na WebSocket");
  djClients.add(ws);

  ws.on("close", () => {
    console.log("DJ odspojen");
    djClients.delete(ws);
  });
});

wssUser.on("connection", (ws) => {
  console.log("Korisnik povezan na WebSocket");
  userClients.add(ws);

  ws.on("close", () => {
    console.log("Korisnik odspojen");
    userClients.delete(ws);
  });
});





// Ruta za Stripe webhook (mora koristiti `bodyParser.raw`)
app.post(
  "/stripe-webhook",
  bodyParser.raw({ type: "application/json" }), // Koristi raw parser samo za webhook
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      

      // Stripe verifikacija
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Obrada Stripe eventa
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      try {
        const requestId = session.metadata.requestId;
        console.log("Plaćanje uspješno za zahtjev:", requestId);

        // Ažurirajte status zahtjeva u bazi podataka
        await pool.query("UPDATE requests SET status = $1 WHERE id = $2", ["paid", requestId]);

        // Obavijestite DJ klijente
        notifyDJClients({
          id: parseInt(requestId),
          status: "paid",
        });
        notifyUserClients({
          id: parseInt(requestId),
          status: "paid",
        });
      } catch (error) {
        console.error("Greška kod ažuriranja statusa zahtjeva:", error);
        return res.status(500).send("Internal Server Error");
      }
    }

    res.json({ received: true });
  }
);

app.get("/user-ids", async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) {
    return res.status(400).json({ message: "clientId is required" });
  }

  try {
    const result = await pool.query("SELECT r.id FROM requests r WHERE r.client_id = $1", [clientId]);
    res.json(result.rows);
    console.log(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching user requests" });
  }
});;


// Endpoints za zahtjeve
app.post("/accept-request", async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query("UPDATE requests SET status = $1 WHERE id = $2", ["awaiting_payment", id]);

    notifyDJClients({ id, status: "awaiting_payment" });
    notifyUserClients({ id, status: "awaiting_payment" });

    res.json({ message: "Request accepted", status: "awaiting_payment" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error accepting request" });
  }
});

app.post("/reject-request", async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query("DELETE FROM requests WHERE id = $1", [id]);

    notifyDJClients({ id, status: "rejected" });
    notifyUserClients({ id, status: "rejected" });

    res.json({ message: "Request rejected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error rejecting request" });
  }
});

app.get("/user-requests", async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) {
    return res.status(400).json({ message: "clientId is required" });
  }

  try {
    const result = await pool.query("SELECT r.* FROM requests r WHERE r.client_id = $1", [clientId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching user requests" });
  }
});


app.get("/requests/:requestId", async (req, res) => {
  const { requestId } = req.params;

  try {
    const result = await pool.query("SELECT * FROM requests WHERE id = $1", [requestId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json(result.rows[0]); // Vraćamo samo prvi (i jedini) redak
  } catch (error) {
    console.error("Error fetching specific request:", error);
    res.status(500).json({ message: "Error fetching the request" });
  }
});


app.get("/requests", async (req, res) => {
  try {
    const result = await pool.query("SELECT r.* FROM requests r");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching user requests" });
  }
});


app.delete("/cancel-request", async (req, res) => {
  const { clientId, requestId } = req.body;
  console.log(requestId, "stiso prvi");

  try {
    await pool.query("DELETE FROM requests WHERE id = $1 AND client_id = $2", [requestId, clientId]);

    wssUser.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "request_cancelled",
            clientId,
            requestId,
          })
        );
      }
    });

    res.status(200).send({ message: "Zahtjev je uspješno prekinut." });
  } catch (error) {
    console.error("Greška pri prekidu zahtjeva:", error);
    res.status(500).send({ error: "Došlo je do greške pri prekidu zahtjeva." });
  }
});

app.delete("/delete-request", async (req, res) => {
  const { id } = req.body;
  console.log(id, "stiso drugi");

  try {
    await pool.query("DELETE FROM requests WHERE id = $1", [id]);

    wssUser.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "request_cancelled",
            clientId,
            requestId,
          })
        );
      }
    });

    res.status(200).send({ message: "Zahtjev je uspješno prekinut." });
  } catch (error) {
    console.error("Greška pri prekidu zahtjeva:", error);
    res.status(500).send({ error: "Došlo je do greške pri prekidu zahtjeva." });
  }
});


app.post("/request", async (req, res) => {
  const { donation, song, comment, clientId, noviId } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO requests (donation, status, song_title, song_video_id, comment, client_id, id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [donation, "pending", song.title, song.videoId, comment, clientId, noviId]
    );

    const request = result.rows[0];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Song Request: ${song.title}`,
            },
            unit_amount: Math.round(donation * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: { requestId: request.id },
    });

    await pool.query("UPDATE requests SET payment_url = $1 WHERE id = $2", [
      session.url,
      request.id,
    ]);



    res.status(200).json({ message: "Request created", id: request.id, paymentUrl: session.url });
    
    // Obavijestite DJ klijente
    notifyDJClients({
      id: parseInt(request.id),
      status: "pending",
    });

  } catch (error) {
    console.error("Error creating payment session:", error);
    res.status(500).json({ message: "Error creating request" });
  }
});


app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "dj" && password === "password") {
    const token = jwt.sign({ role: "dj" }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }
  return res.status(401).json({ message: "Invalid credentials" });
});

app.listen(API_PORT, () => {
  console.log(`API server running on http://localhost:${API_PORT}`);
});

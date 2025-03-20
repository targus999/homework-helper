require("dotenv").config();
const express = require("express");
const { setupWebSocket } = require('./websocket/websocket');
const { createServer } = require('http');
const https = require('https');

const app = express();

// Detect if running in Railway (HTTPS) and adjust protocol
if (process.env.RAILWAY_STATIC_URL) {
    server = https.createServer(app);
    console.log("Running with HTTPS");
} else {
    server = createServer(app);
    console.log("Running with HTTP");
}

setupWebSocket(server);


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

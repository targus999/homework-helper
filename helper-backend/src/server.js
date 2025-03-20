require("dotenv").config();
const express = require("express");
const { setupWebSocket } = require('./websocket/websocket');
const { createServer } = require('http');

const app = express();

const server = createServer(app);

setupWebSocket(server);


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

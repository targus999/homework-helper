const { WebSocketServer } = require('ws');
const axios = require('axios');
const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,  
});

function setupWebSocket(server) {
    console.log("Socket connection waiting...");
    const wss = new WebSocketServer({ server, cors: { origin: "*" } });

    const header = {
        headers: {
            'Authorization': `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json',
        },
    };

    // Store session history for each client connection
    const sessionHistory = new Map();

    wss.on('connection', async(ws) => {
        console.log('Client connected');
         // Generate a unique session key (can be improved with user authentication)
         const sessionId = `session:${ws._socket.remoteAddress}`;

         // Retrieve chat history from Redis and send to the client
         const historyString = await redis.get(sessionId);
         const history = historyString ? JSON.parse(historyString) : [];
 
         ws.send(JSON.stringify({ type: 'history', messages: history }));


        ws.on('message', async (message) => {
            const userMessage = message.toString();
            console.log('Received:', userMessage);

            // Generate a unique session key (e.g., using WebSocket object)
            const sessionId = `session:${ws._socket.remoteAddress}`;

            // Retrieve chat history from Redis
            const historyString = await redis.get(sessionId);
            const history = historyString ? JSON.parse(historyString) : [];

            // System context to guide without giving answers
            const homeworkContext = "Introduce yourself as Homework helper who helps students understand homework by asking guiding questions and providing hints. Do not give direct answers.";

            // Append user message to history
            history.push({ role: 'user', content: userMessage });

            // Keep only the last 10 messages (to avoid API overload)
            if (history.length > 10) history.shift();

            try {
                // Send history along with new message
                const response = await axios.post(
                    process.env.AI_API_URL,
                    {
                        model: 'google/gemma-3-4b-it:free',
                        messages: [
                            { role: 'system', content: homeworkContext },
                            ...history, // Send previous messages for context
                        ],
                    },
                    header
                );

                const aiMessage = response.data.choices[0].message.content;

                // Append AI response to history
                history.push({ role: 'assistant', content: aiMessage });

                // Store updated history in Redis (expire after 5min)
                await redis.setex(sessionId, 300, JSON.stringify(history));

                ws.send(aiMessage);
            } catch (error) {
                console.error('Error:', error.message);
                ws.send('Error processing request');
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            sessionHistory.delete(ws); // Remove history when client disconnects
        });
    });
}

module.exports = { setupWebSocket };

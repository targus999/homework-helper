const { WebSocketServer } = require('ws');
const axios = require('axios');

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

    wss.on('connection', (ws) => {
        console.log('Client connected');
        sessionHistory.set(ws, []); // Initialize empty history for new client

        ws.on('message', async (message) => {
            const userMessage = message.toString();
            console.log('Received:', userMessage);

            // Retrieve chat history for this session
            const history = sessionHistory.get(ws) || [];

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

                // Update session history
                sessionHistory.set(ws, history);

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

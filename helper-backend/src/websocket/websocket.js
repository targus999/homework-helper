const { WebSocketServer } = require('ws');
const axios = require('axios');
const Redis = require('ioredis');
const Tesseract = require("tesseract.js");

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
});

function setupWebSocket(server) {
    console.log("Socket connection waiting...");
    const wss = new WebSocketServer({ server });

    const header = {
        headers: {
            'Authorization': `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json',
        },
    };

    wss.on('connection', async (ws, req) => {
        console.log('Client connected');
        const sessionId = `session:${req.socket.remoteAddress}`;

        try {
            // Retrieve chat history from Redis
            const historyString = await redis.get(sessionId);
            let history = historyString ? JSON.parse(historyString) : [];

            ws.send(JSON.stringify({ type: 'history', messages: history }));
        } catch (err) {
            console.error('Error retrieving history:', err);
        }

        ws.on('message', async (message) => {
            try {
                let parsedMessages;

                try {
                    parsedMessages = JSON.parse(message); // Expecting an array
                    if (!Array.isArray(parsedMessages)) throw new Error();
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
                    return;
                }

                console.log('Received messages:', parsedMessages);

                const historyString = await redis.get(sessionId);
                let history = historyString ? JSON.parse(historyString) : [];

                // Define the context for AI response
                const homeworkContext = "Solve the problems.";

                let extractedTexts = [];

                // Process all messages
                for (const msg of parsedMessages) {
                    if (msg.type === 'text' && msg.text.trim() !== '') {
                        history.push({ role: 'user', content: msg.text });
                    }

                    if (msg.type === 'image_url' && msg.image_url) {
                        try {
                            const imageDataUri = `data:image/webp;base64,${msg.image_url}`;
                            console.log("Processing Image OCR...");
                            const ocrResult = await Tesseract.recognize(imageDataUri, "eng");
                            const extractedText = ocrResult.data.text.trim();
                            
                            console.log("Extracted Text:", extractedText);
                            
                            if (extractedText) {
                                extractedTexts.push(extractedText);
                                history.push({ role: 'user', content: extractedText });
                            }
                        } catch (err) {
                            console.error("OCR Error:", err);
                        }
                    }
                }

                if (history.length > 10) history.shift(); // Keep last 10 messages

                // **Wait until OCR extraction is done before calling AI API**
                if (history.length > 0) {
                    console.log('Sending to AI API:', history);

                    // Format messages for OpenRouter
                    const formattedMessages = [{ role: 'system', content: homeworkContext }, ...history];

                    // Send to AI model
                    const response = await axios.post(
                        process.env.AI_API_URL,
                        {
                            model: 'google/gemma-3-12b-it:free',
                            messages: formattedMessages,
                        },
                        header
                    );

                    console.log(response.data.choices);
                    if (response.data && response.data.choices && response.data.choices.length > 0) {
                        const aiMessage = response.data.choices[0].message.content;

                        // Append AI response
                        history.push({ role: 'assistant', content: aiMessage });

                        ws.send(JSON.stringify({ type: 'message', sender: 'Homework Helper', text: aiMessage }));

                        // Store updated history in Redis (expires after 5 min)
                        await redis.setex(sessionId, 300, JSON.stringify(history));
                    } else {
                        console.error('Unexpected AI API response:', response.data);
                        ws.send(JSON.stringify({ type: 'error', message: 'AI response error' }));
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error);
                ws.send(JSON.stringify({ type: 'error', message: 'Error processing request' }));
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });
}

module.exports = { setupWebSocket };

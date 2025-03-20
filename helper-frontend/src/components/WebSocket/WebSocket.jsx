import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const WebSocketChat = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [ws, setWs] = useState(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:5000'); // Adjust server URL if needed

        socket.onopen = () => console.log('Connected to WebSocket');
        socket.onmessage = (event) => {
            setMessages((prev) => [...prev, { sender: 'AI', text: event.data }]);
        };
        socket.onclose = () => console.log('WebSocket disconnected');
        socket.onerror = (error) => console.error('WebSocket error:', error);

        setWs(socket);

        return () => {
            socket.close();
        };
    }, []);

    const sendMessage = () => {
        if (ws && message.trim() !== '') {
            ws.send(message);
            setMessages((prev) => [...prev, { sender: 'You', text: message }]);
            setMessage('');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '20px auto', textAlign: 'center' }}>
            <h2>Homework Helper</h2>
            <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ textAlign: msg.sender === 'You' ? 'right' : 'left' }}>
                        <strong>{msg.sender}: </strong>
                        {msg.sender === 'AI' ? (
                            <ReactMarkdown>{msg.text}</ReactMarkdown> // ✅ Render Markdown
                        ) : (
                            msg.text
                        )}
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your question..."
                style={{ width: '80%', padding: '5px', marginTop: '10px' }}
            />
            <button onClick={sendMessage} style={{ marginLeft: '10px', padding: '5px' }}>Send</button>
        </div>
    );
};

export default WebSocketChat;

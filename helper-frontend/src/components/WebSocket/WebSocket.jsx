import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './WebSocket.css';


const WebSocketChat = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [ws, setWs] = useState(null);
    const messagesEndRef = useRef(null);
    const [typingDots, setTypingDots] = useState('');

    useEffect(() => {
        const socket = new WebSocket(process.env.REACT_APP_WS_URL);

        socket.onopen = () => console.log('Connected to WebSocket');
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data)

            if (data.type === 'history') {
                if (data.messages)
                    setMessages(data.messages.map(msg => ({
                        sender: msg.role === 'user' ? 'You' : 'Homework Helper',
                        text: msg.content
                    })));
            } else if (data.type === 'message') {
                setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
            }
            setIsTyping(false);
        };

        socket.onclose = () => console.log('WebSocket disconnected');
        socket.onerror = (error) => console.error('WebSocket error:', error);

        setWs(socket);

        return () => socket.close();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    useEffect(() => {
        if (isTyping) {
            const interval = setInterval(() => {
                setTypingDots((prev) => (prev.length < 3 ? prev + '.' : ''));
            }, 500);
            return () => clearInterval(interval);
        }
    }, [isTyping]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Allow new line
                setMessage((prev) => prev + '\n');
            } else {
                // Prevent default Enter behavior (so it doesn't add a newline)
                e.preventDefault();
                sendMessage();
            }
        }
    };

    const sendMessage = () => {
        if (ws && message.trim() !== '') {
            ws.send(message);
            setMessages((prev) => [...prev, { sender: 'You', text: message }]);
            setMessage('');

            // Start typing indicator 1 second after sending message
            setTimeout(() => {
                setIsTyping(true);
            }, 1000);
        }
    };

    return (
        <div className="chat-container">
            <h2 className="chat-title">Homework Helper</h2>
            <div className="chat-box">
                <div className="messages-container">
                    {messages.length === 0 && (
                        <div className="empty-chat-message">
                            Please ask me anything
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender === 'You' ? 'you' : 'ai'}`}>
                            <strong>{msg.sender}</strong>
                            {msg.sender === 'Homework Helper' ? (
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            ) : (
                                msg.text
                            )}
                        </div>
                    ))}
                    {isTyping && (
                        <div className="message ai typing-bubble">
                            <strong>Homework Helper</strong>
                            <span className="typing-dots">{typingDots || '.'}</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="input-container">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your question..."
                    onKeyDown={handleKeyDown}
                    className="input-box"
                />
                <button onClick={sendMessage} className="send-button" disabled={isTyping}>Send</button>
            </div>
        </div>
    );
};

export default WebSocketChat;

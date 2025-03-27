import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaPaperPlane, FaUpload, FaTimes } from 'react-icons/fa';
import { CiFileOn } from "react-icons/ci";
import './WebSocket.css';

const WebSocketChat = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [ws, setWs] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const socket = new WebSocket(process.env.REACT_APP_WS_URL);

        socket.onopen = () => console.log('Connected to WebSocket');
        socket.onmessage = (event) => {
            console.log(event.data)
            const data = JSON.parse(event.data);
            if (data.type === 'history') {
                setMessages(data.messages.map(msg => ({
                    sender: msg.role === 'user' ? 'You' : 'Homework Helper',
                    text: msg.content,
                    filename: msg.filename || null
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const sendMessage = () => {
        if (ws && (message.trim() !== '' || selectedFile)) {
            const payload = [];

            const sendPayload = () => {
                if (payload.length > 0) {
                    ws.send(JSON.stringify(payload));
                    setMessages(prev => [
                        ...prev,
                        ...payload.map(item => ({
                            sender: 'You',
                            text: item.type === 'image_url' ? <div className='file-preview'><CiFileOn />{item.filename}</div> : item.text
                        }))
                    ]);
                }
                setMessage('');
                setSelectedFile(null);
                setTimeout(() => setIsTyping(true), 1000);
            };

            if (selectedFile) {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64String = reader.result.split(',')[1];
                    payload.push({ type: 'image_url', image_url: base64String, filename: selectedFile.name });
                    sendPayload();
                };
                reader.readAsDataURL(selectedFile);
            }

            if (message.trim() !== '') {
                payload.push({ type: 'text', text: message });
            }

            if (!selectedFile) {
                sendPayload();
            }
        }
    };



    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        console.log(file)
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setFilePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset input value to allow re-selection of the same file
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h2>Homework Helper</h2>
            </div>
            <div className="chat-box">
                <div className="messages-container">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender === 'You' ? 'you' : 'ai'}`}>
                            <strong>{msg.sender} <br /></strong>
                            {msg.sender === 'Homework Helper' ? (
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            ) : (
                                (() => {
                                    if (msg.filename) {
                                        return <div className='file-preview'><CiFileOn />{msg.filename}</div>
                                    } else {
                                        return <span>{msg.text}</span>;
                                    }
                                })()
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <div className="message ai typing-bubble">
                            <span className="typing-dots">...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="input-container">
                {selectedFile && (
                    <div className="file-preview" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                            src={filePreview}
                            alt="preview"
                            style={{ width: '50px', height: '50px', borderRadius: '5px' }}
                        />
                        <FaTimes className="remove-file" onClick={removeSelectedFile} style={{ cursor: 'pointer' }} />
                    </div>
                )}
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your question..."
                    onKeyDown={handleKeyDown}
                    className="input-box"
                />
                <input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/png, image/jpeg, image/webp"
                    ref={fileInputRef}
                    className="file-upload"
                    style={{ display: 'none' }}
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="upload-button">
                    <FaUpload />
                </label>
                <button onClick={sendMessage} className="send-button" disabled={isTyping}>
                    <FaPaperPlane />
                </button>
            </div>
        </div>
    );
};

export default WebSocketChat;
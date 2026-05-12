import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthSession } from '../../services/auth-storage';
import api from '../../services/api';
import './ChatSidebar.css';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: 'admin' | 'doctor';
  content: string;
  createdAt: string;
}

interface Chat {
  id: string;
  doctorId: string;
  messages: Message[];
  unreadCountDoctor: number;
}

export const ChatSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const initChat = useCallback(async () => {
    try {
      const response = await api.get('/support-chat/my-chat');
      setChat(response.data);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to initialize chat:', err);
    }
  }, []);

  useEffect(() => {
    const session = getAuthSession();
    const token = session?.token;
    if (!token) return;

    if (!socketRef.current) {
      const socketUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:4001';
      const socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        setIsConnecting(false);
        console.log('Doctor socket connected');
      });

      socket.on('new_message', (data: { chatId: string; message: Message }) => {
        setMessages((prev) => [...prev, data.message]);
      });

      socketRef.current = socket;
    }

    initChat();

    return () => {
      // We keep the socket alive during the session, but we could disconnect on unmount
      // socketRef.current?.disconnect();
    };
  }, [initChat]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chat) return;

    const messageContent = input.trim();
    setInput('');

    try {
      await api.post('/support-chat/send', {
        chatId: chat.id,
        content: messageContent,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <>
      <button 
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Support Chat"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <circle cx="8" cy="9" r="1" fill="currentColor"></circle>
            <circle cx="12" cy="9" r="1" fill="currentColor"></circle>
            <circle cx="16" cy="9" r="1" fill="currentColor"></circle>
          </svg>
        )}
      </button>

      <div className={`chat-sidebar ${isOpen ? '' : 'closed'}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-logo">CARE</div>
            <h3>CareLoop Support</h3>
          </div>
          <button className="input-icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && !isConnecting && (
            <div style={{ textAlign: 'center', color: '#888', marginTop: '20px', fontSize: '0.9rem' }}>
              👋 How can we help? We're usually online during office hours.
            </div>
          )}
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message ${msg.senderRole === 'doctor' ? 'sent' : 'received'}`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area-wrapper">
          <form className="chat-input-container" onSubmit={handleSendMessage}>
            <input 
              type="text"
              className="chat-input"
              placeholder="Say something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="input-icons">
              <button type="button" className="input-icon-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </button>
              <button type="button" className="input-icon-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              </button>
            </div>
            <button type="submit" className="chat-send-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

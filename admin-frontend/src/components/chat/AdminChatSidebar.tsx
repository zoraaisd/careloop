import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthSession } from '../../services/auth-storage';
import { apiClient } from '../../services/api';
import './AdminChatSidebar.css';

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
  doctor?: {
    name: string;
  };
  messages: Message[];
  lastMessage: string | null;
  unreadCountAdmin: number;
}

export const AdminChatSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = useCallback(async () => {
    try {
      const response = await apiClient.get('/support-chat/admin/chats');
      setChats(response.data);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchChats();
    }
  }, [isOpen, fetchChats]);

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
        console.log('Admin socket connected');
      });

      socket.on('new_message', (data: { chatId: string; message: Message }) => {
        // Update the list regardless
        setChats((prev) => 
          prev.map((c) => 
            c.id === data.chatId 
              ? { ...c, lastMessage: data.message.content, unreadCountAdmin: c.id === selectedChatIdRef.current ? 0 : c.unreadCountAdmin + 1 } 
              : c
          )
        );

        // If this is the active chat, update message window
        if (data.chatId === selectedChatIdRef.current) {
          setMessages((prev) => [...prev, data.message]);
        }
      });

      socketRef.current = socket;
    }

    return () => {
      // Keep socket alive
    };
  }, []);

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setMessages(chat.messages || []);
    selectedChatIdRef.current = chat.id;
    
    // Join the doctor's room for real-time updates
    socketRef.current?.emit('join_doctor_chat', chat.doctorId);

    try {
      await apiClient.post(`/support-chat/${chat.id}/read`);
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCountAdmin: 0 } : c));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !selectedChat) return;

    const messageContent = input.trim();
    setInput('');

    try {
      const response = await apiClient.post('/support-chat/send', {
        chatId: selectedChat.id,
        content: messageContent,
      });
      // The socket listener will catch the broadcast and add it to setMessages
      // But we can also add it immediately for better UX
      // Actually, my backend emits to everyone in the room including sender
      // If we add it here too, it might double up if socket is fast.
      // Better to just let the socket handle it or check for duplicates.
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <>
      <button 
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
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

      <div className={`admin-chat-sidebar ${isOpen ? '' : 'closed'}`}>
        <div className="doctor-list-area">
          <div className="doctor-list-header">Doctors</div>
          <div className="doctor-items">
            {chats.map((c) => (
              <div 
                key={c.id} 
                className={`doctor-item ${selectedChat?.id === c.id ? 'active' : ''}`}
                onClick={() => handleSelectChat(c)}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="doctor-name">{c.doctor?.name || 'Unknown Doctor'}</span>
                  {c.unreadCountAdmin > 0 && <span className="unread-badge">{c.unreadCountAdmin}</span>}
                </div>
                <div className="last-msg">{c.lastMessage || 'No messages yet'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-main-area">
          {selectedChat ? (
            <>
              <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', background: '#1d3029', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem' }}>
                    {selectedChat.doctor?.name?.charAt(0) || 'D'}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem' }}>{selectedChat.doctor?.name}</h3>
                </div>
                <button className="input-icon-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
              </div>

              <div className="chat-messages">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`message ${msg.senderRole === 'admin' ? 'sent' : 'received'}`}
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
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button type="submit" className="chat-send-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a9691', fontSize: '0.9rem' }}>
              Select a doctor to start chatting
            </div>
          )}
        </div>
      </div>
    </>
  );
};

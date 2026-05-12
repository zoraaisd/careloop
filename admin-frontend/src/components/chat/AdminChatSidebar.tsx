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

interface AdminChatSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onUnreadChange?: (count: number) => void;
}

export const AdminChatSidebar: React.FC<AdminChatSidebarProps> = ({ isOpen, setIsOpen, onUnreadChange }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  // Resizing state
  const [sidebarWidth, setSidebarWidth] = useState(500);
  const [listWidth, setListWidth] = useState(200);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingDivider, setIsResizingDivider] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync total unread to layout
  useEffect(() => {
    const total = chats.reduce((acc, c) => acc + (c.unreadCountAdmin || 0), 0);
    onUnreadChange?.(total);
  }, [chats, onUnreadChange]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('.chat-toggle-btn') || target.closest('button[title="Open Support Chat"]')) {
          return;
        }
        setIsOpen(false);
      }
    };

    if (isOpen && !isResizingSidebar && !isResizingDivider) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, setIsOpen, isResizingSidebar, isResizingDivider]);

  // Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < 1000) {
          setSidebarWidth(newWidth);
        }
      } else if (isResizingDivider) {
        if (sidebarRef.current) {
          const sidebarRect = sidebarRef.current.getBoundingClientRect();
          const newListWidth = e.clientX - sidebarRect.left;
          if (newListWidth > 150 && newListWidth < sidebarWidth - 150) {
            setListWidth(newListWidth);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingDivider(false);
      document.body.style.cursor = 'default';
    };

    if (isResizingSidebar || isResizingDivider) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingDivider, sidebarWidth]);

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
        setChats((prev) => 
          prev.map((c) => 
            c.id === data.chatId 
              ? { ...c, lastMessage: data.message.content, unreadCountAdmin: c.id === selectedChatIdRef.current ? 0 : (c.unreadCountAdmin || 0) + 1 } 
              : c
          )
        );

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
      await apiClient.post('/support-chat/send', {
        chatId: selectedChat.id,
        content: messageContent,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div 
      ref={sidebarRef}
      className={`admin-chat-sidebar ${isOpen ? '' : 'closed'}`}
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Sidebar Edge Resizer */}
      <div 
        className="sidebar-resize-handle"
        onMouseDown={() => setIsResizingSidebar(true)}
      />

      <div className="doctor-list-area" style={{ width: `${listWidth}px` }}>
        <div className="doctor-list-header">Messages</div>
        <div className="doctor-items">
          {chats.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
              No active support chats
            </div>
          )}
          {chats.map((c) => (
            <div 
              key={c.id} 
              className={`doctor-item ${selectedChat?.id === c.id ? 'active' : ''}`}
              onClick={() => handleSelectChat(c)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="doctor-name">{c.doctor?.name || 'Unknown Doctor'}</span>
                {c.unreadCountAdmin > 0 && <span className="unread-badge" style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{c.unreadCountAdmin}</span>}
              </div>
              <div className="last-msg">{c.lastMessage || 'No messages yet'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Internal Divider Resizer */}
      <div 
        className="divider-resize-handle"
        onMouseDown={() => setIsResizingDivider(true)}
      />

      <div className="chat-main-area">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #1d3029 0%, #3a5c4f 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {selectedChat.doctor?.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1d3029' }}>{selectedChat.doctor?.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#8a9691' }}>Support Request</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="input-icon-btn" onClick={() => setIsOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
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
                  placeholder="Type a response..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" className="chat-send-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8a9691', padding: '40px' }}>
            <div className="header-close-btn-only" style={{ position: 'absolute', top: '24px', right: '24px' }}>
               <button className="input-icon-btn" onClick={() => setIsOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
            <div style={{ fontSize: '3rem', marginBottom: '20px', opacity: 0.3 }}>💬</div>
            <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>Select a conversation to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};

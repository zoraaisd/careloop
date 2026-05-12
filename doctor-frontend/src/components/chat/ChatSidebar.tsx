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

interface ChatSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onUnreadChange?: (count: number) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, setIsOpen, onUnreadChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Resizing state
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (unreadCount > 0) {
        setUnreadCount(0);
        onUnreadChange?.(0);
      }
    }
  }, [messages, isOpen, unreadCount, onUnreadChange]);

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

    if (isOpen && !isResizing) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, setIsOpen, isResizing]);

  // Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < 800) {
          setSidebarWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const initChat = useCallback(async () => {
    try {
      const response = await api.get('/support-chat/my-chat');
      setChat(response.data);
      setMessages(response.data.messages || []);
      
      // Calculate initial unread (if needed, but usually doctor frontend loads everything)
      const unread = response.data.messages?.filter((m: any) => m.senderRole === 'admin' && !m.isRead).length || 0;
      if (unread > 0 && !isOpen) {
        setUnreadCount(unread);
        onUnreadChange?.(unread);
      }
    } catch (err) {
      console.error('Failed to initialize chat:', err);
    }
  }, [onUnreadChange, isOpen]);

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
        
        // If chat is closed and message is from admin, increment unread
        if (data.message.senderRole === 'admin') {
          setUnreadCount(prev => {
            const next = prev + 1;
            // Only update layout if sidebar is closed
            // If sidebar is open, it will be reset by the other useEffect
            return next;
          });
        }
      });

      socketRef.current = socket;
    }

    initChat();

    return () => {
      // socketRef.current?.disconnect();
    };
  }, [initChat]);

  // Sync unreadCount to parent when it changes
  useEffect(() => {
    if (!isOpen) {
      onUnreadChange?.(unreadCount);
    }
  }, [unreadCount, isOpen, onUnreadChange]);

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
    <div 
      ref={sidebarRef}
      className={`chat-sidebar ${isOpen ? '' : 'closed'}`}
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Sidebar Edge Resizer */}
      <div 
        className="sidebar-resize-handle"
        onMouseDown={() => setIsResizing(true)}
      />

      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-logo">CARE</div>
          <h3>Support</h3>
        </div>
        <div className="header-actions">
          <button className="input-icon-btn" onClick={() => setIsOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !isConnecting && (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '40px', padding: '0 20px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✨</div>
            <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>How can we help you today?</p>
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
            placeholder="Type a message..."
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
    </div>
  );
};

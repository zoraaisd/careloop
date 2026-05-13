import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthSession } from '../../services/auth-storage';
import api from '../../services/api';

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

  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markCurrentChatAsRead = useCallback(async () => {
    if (!chat?.id) return;
    try {
      await api.post(`/support-chat/${chat.id}/read`);
    } catch (err) {
      console.error('Failed to mark chat as read:', err);
    }
  }, [chat?.id]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (unreadCount > 0) {
        setUnreadCount(0);
        onUnreadChange?.(0);
      }
      void markCurrentChatAsRead();
    }
  }, [messages, isOpen, unreadCount, onUnreadChange, markCurrentChatAsRead]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('button[title="Open Support Chat"]')) {
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

        if (data.message.senderRole === 'admin') {
          if (isOpen) {
            void markCurrentChatAsRead();
            setUnreadCount(0);
            onUnreadChange?.(0);
          } else {
            setUnreadCount((prev) => prev + 1);
          }
        }
      });

      socketRef.current = socket;
    }

    initChat();

    return () => {
      // socketRef.current?.disconnect();
    };
  }, [initChat, isOpen, markCurrentChatAsRead, onUnreadChange]);

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
      className={[
        'fixed right-0 top-0 z-[2000] flex h-screen flex-col border-l border-white/30 bg-white/85 shadow-[-10px_0_50px_rgba(0,0,0,0.1)] backdrop-blur-[25px] [backdrop-filter:saturate(180%)_blur(25px)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        isOpen ? 'visible translate-x-0 pointer-events-auto' : 'invisible translate-x-full pointer-events-none',
      ].join(' ')}
      style={{ width: `${sidebarWidth}px` }}
    >
      <div
        className="absolute left-[-4px] top-0 z-[2100] h-full w-2 cursor-col-resize max-lg:hidden"
        onMouseDown={() => setIsResizing(true)}
      />

      <div className="flex items-center justify-between border-b border-black/5 px-6 py-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1d3029] to-[#3a5c4f] text-[0.7rem] font-black tracking-[1px] text-white shadow-[0_4px_15px_rgba(29,48,41,0.2)]">
            CARE
          </div>
          <h3 className="text-[1.1rem] font-extrabold tracking-[-0.02em] text-[#1d3029]">Support</h3>
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6e4dd] bg-white text-[#173a31] transition hover:bg-[#eef5f1]"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {messages.length === 0 && !isConnecting ? (
          <div className="mt-10 px-5 text-center text-[#888888]">
            <div className="mb-2.5 text-3xl">*</div>
            <p className="text-[0.9rem] font-medium">How can we help you today?</p>
          </div>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={[
              'max-w-[85%] rounded-[20px] px-[18px] py-[14px] text-[0.95rem] font-medium leading-6 transition-all',
              msg.senderRole === 'doctor'
                ? 'self-end rounded-br-[4px] bg-[#1d3029] text-white shadow-[0_4px_15px_rgba(29,48,41,0.15)]'
                : 'self-start rounded-bl-[4px] bg-white text-[#1d3029] shadow-[0_2px_10px_rgba(0,0,0,0.03)]',
            ].join(' ')}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-transparent px-6 py-6">
        <form
          className="flex items-center gap-3 rounded-[24px] border border-black/5 bg-white/90 px-4 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
          onSubmit={handleSendMessage}
        >
          <input
            type="text"
            className="flex-1 border-none bg-transparent py-3 text-[0.95rem] font-medium text-[#1d3029] outline-none"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d3029] text-white shadow-[0_4px_10px_rgba(29,48,41,0.2)] transition duration-300 hover:scale-110 hover:-rotate-[10deg] hover:bg-[#2c4a3f]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

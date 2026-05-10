import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export function ChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: booking } = useBooking(bookingId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase.channel(`chat:${bookingId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as Message]);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!draft.trim() || !bookingId || !user) return;
    setSending(true);
    const msg: Message = {
      id: crypto.randomUUID(),
      senderId: user.id,
      body: draft.trim(),
      createdAt: new Date().toISOString(),
    };
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'message',
      payload: msg,
    });
    setDraft('');
    setSending(false);
  }

  const provider = booking
    ? ((booking as unknown as Record<string, unknown>)['provider'] as Record<string, unknown> | undefined)
    : undefined;

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-0 h-[calc(100svh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-border flex-shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {provider ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary text-sm">
                {String(provider['display_name'] ?? 'P').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {String(provider['display_name'] ?? 'Provider')}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="font-medium text-foreground">Chat</p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <p className="text-muted-foreground text-sm">No messages yet</p>
              <p className="text-muted-foreground text-xs mt-1">
                Send a message to get started
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}
                >
                  <p>{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-3 items-end pt-4 border-t border-border flex-shrink-0">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message..."
            className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

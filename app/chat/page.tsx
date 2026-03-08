'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { createClient } from '@/lib/supabase/client';
import { Reservation } from '@/lib/types';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: number;
  reservation_id: number;
  sender_id: string;
  sender_role: 'client' | 'employee';
  sender_name: string;
  content: string;
  created_at: string;
}

interface LastMessage {
  reservation_id: number;
  content: string;
  created_at: string;
}

interface ThreadRead {
  reservation_id: number;
  read_at: string;
}

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

export default function ChatPage() {
  const { reservations, currentUser, getEvent } = useAppContext();
  const [showCompletedCancelled, setShowCompletedCancelled] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});
  const [threadReads, setThreadReads] = useState<Record<string, string>>({});

  const filteredReservations = useMemo(
    () =>
      reservations.filter((r) => showCompletedCancelled || ACTIVE_STATUSES.includes(r.status)),
    [reservations, showCompletedCancelled]
  );

  const sortedReservations = useMemo(() => {
    return [...filteredReservations].sort((a, b) => {
      const lastA = lastMessages[a.id]?.created_at ?? a.createdAt;
      const lastB = lastMessages[b.id]?.created_at ?? b.createdAt;
      return new Date(lastB).getTime() - new Date(lastA).getTime();
    });
  }, [filteredReservations, lastMessages]);

  useEffect(() => {
    if (filteredReservations.length === 0 || !currentUser?.id) return;
    let discarded = false;
    const supabase = createClient();
    const ids = filteredReservations.map((r) => parseInt(r.id, 10));

    Promise.all([
      supabase
        .from('chat_messages')
        .select('reservation_id, content, created_at')
        .in('reservation_id', ids)
        .order('created_at', { ascending: false }),
      supabase
        .from('chat_thread_reads')
        .select('reservation_id, read_at')
        .eq('user_id', currentUser.id)
        .in('reservation_id', ids),
    ]).then(([msgRes, readRes]) => {
      if (discarded) return;
      const lastByRes: Record<string, LastMessage> = {};
      (msgRes.data ?? []).forEach((row: LastMessage) => {
        const key = String(row.reservation_id);
        if (!lastByRes[key]) lastByRes[key] = row;
      });
      setLastMessages(lastByRes);
      const readsByRes: Record<string, string> = {};
      (readRes.data ?? []).forEach((row: ThreadRead) => {
        readsByRes[String(row.reservation_id)] = row.read_at;
      });
      setThreadReads(readsByRes);
    });

    return () => {
      discarded = true;
    };
  }, [filteredReservations, currentUser]);

  useEffect(() => {
    if (!selectedReservation) return;
    const reservationId = selectedReservation.id;
    let discarded = false;
    const supabase = createClient();

    supabase
      .from('chat_messages')
      .select('*')
      .eq('reservation_id', parseInt(reservationId, 10))
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (discarded) return;
        if (error) {
          console.error('Failed to fetch messages:', error);
          setMessages([]);
          return;
        }
        setMessages((data as ChatMessage[]) ?? []);
      });

    if (currentUser?.id) {
      supabase
        .from('chat_thread_reads')
        .upsert(
          {
            user_id: currentUser.id,
            reservation_id: parseInt(reservationId, 10),
            read_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,reservation_id' }
        )
        .then(() => {
          if (!discarded) {
            setThreadReads((prev) => ({ ...prev, [reservationId]: new Date().toISOString() }));
          }
        });
    }

    const channel = supabase
      .channel(`chat-${selectedReservation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `reservation_id=eq.${selectedReservation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          setLastMessages((prev) => ({
            ...prev,
            [selectedReservation.id]: {
              reservation_id: parseInt(selectedReservation.id, 10),
              content: newMsg.content,
              created_at: newMsg.created_at,
            },
          }));
        }
      )
      .subscribe();

    return () => {
      discarded = true;
      supabase.removeChannel(channel);
    };
  }, [selectedReservation, currentUser]);

  const handleSend = async () => {
    if (!selectedReservation || !currentUser?.id || !inputValue.trim()) return;
    setIsSending(true);
    const supabase = createClient();
    const { error } = await supabase.from('chat_messages').insert({
      reservation_id: parseInt(selectedReservation.id, 10),
      sender_id: currentUser.id,
      sender_role: 'employee',
      sender_name: currentUser.name || currentUser.email.split('@')[0],
      content: inputValue.trim(),
    });
    setIsSending(false);
    if (!error) {
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-0 overflow-hidden animate-in fade-in duration-300">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Chat Support</h1>
        <p className="text-muted-foreground mt-0.5">
          Message customers about their reservations
        </p>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 min-h-0 rounded-lg border mt-4"
      >
        <ResizablePanel defaultSize={35} minSize={20}>
          <div className="flex flex-col h-full min-h-0 p-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <Label htmlFor="show-all" className="text-sm whitespace-nowrap">
                Show completed/cancelled
              </Label>
              <Switch
                id="show-all"
                checked={showCompletedCancelled}
                onCheckedChange={setShowCompletedCancelled}
              />
            </div>
            <ScrollArea className="flex-1 min-h-0 pr-2">
              <div className="space-y-1">
                {sortedReservations.map((r) => {
                  const event = getEvent(r.eventId);
                  const isSelected = selectedReservation?.id === r.id;
                  const lastMsg = lastMessages[r.id];
                  const readAt = threadReads[r.id];
                  const isUnread =
                    lastMsg &&
                    (!readAt || new Date(lastMsg.created_at) > new Date(readAt));
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedReservation(r)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : isUnread
                            ? 'hover:bg-muted'
                            : 'opacity-70 hover:opacity-90 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`shrink-0 size-2 rounded-full ${
                            isUnread
                              ? isSelected
                                ? 'bg-primary-foreground'
                                : 'bg-primary'
                              : 'invisible'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate text-sm min-w-0">
                              {r.customerName} • {event?.name ?? `Event #${r.eventId}`} • Cabin{' '}
                              {r.cabinId}
                            </p>
                            <span className="shrink-0 text-sm font-medium">{r.status}</span>
                          </div>
                          {lastMsg ? (
                            <div
                              className={`flex items-center justify-between gap-2 mt-2 text-sm ${
                                isSelected ? 'opacity-90' : 'text-muted-foreground'
                              }`}
                            >
                              <span className="truncate min-w-0">{lastMsg.content}</span>
                              <span className="shrink-0 whitespace-nowrap">
                                {new Date(lastMsg.created_at).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <p
                              className={`text-sm mt-2 ${
                                isSelected ? 'opacity-70' : 'text-muted-foreground'
                              }`}
                            >
                              No messages yet
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} minSize={40}>
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {selectedReservation ? (
              <>
                <div className="p-4 border-b shrink-0">
                  <h2 className="font-semibold">{selectedReservation.customerName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {getEvent(selectedReservation.eventId)?.name} • Cabin{' '}
                    {selectedReservation.cabinId} • {selectedReservation.status}
                  </p>
                </div>
                <ScrollArea className="flex-1 min-h-0 p-4 pt-8">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No messages yet. Start the conversation.
                      </p>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${
                            m.sender_role === 'employee' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${
                              m.sender_role === 'employee'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-xs opacity-80">{m.sender_name}</p>
                            <div className="flex flex-row items-baseline justify-between gap-4 mt-1.5">
                              <p className="text-lg flex-1 min-w-0">{m.content}</p>
                              <span className="text-xs opacity-70 shrink-0 whitespace-nowrap">
                                {new Date(m.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t flex gap-2 shrink-0 bg-background">
                  <Input
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  />
                  <Button onClick={handleSend} disabled={isSending || !inputValue.trim()}>
                    Send
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="size-16 mb-4 opacity-50" />
                <p>Select a reservation to view and reply to messages</p>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

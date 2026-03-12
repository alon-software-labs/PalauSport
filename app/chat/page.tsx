'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '@/lib/context';
import { createClient } from '@/lib/supabase/client';
import { Reservation, ReservationStatus } from '@/lib/types';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

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

const FILTER_STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED'];

export default function ChatPage() {
  const { reservations, currentUser, getEvent, updateReservation } = useAppContext();
  const [activeFilters, setActiveFilters] = useState<ReservationStatus[]>(['PENDING', 'CONFIRMED']);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});
  const [threadReads, setThreadReads] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedReservation]);

  const filteredReservations = useMemo(
    () =>
      reservations.filter((r) => activeFilters.includes(r.status)),
    [reservations, activeFilters]
  );

  const toggleFilter = (status: ReservationStatus) => {
    setActiveFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

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

  const handleStatusUpdate = async (newStatus: ReservationStatus) => {
    if (!selectedReservation) return;

    setIsUpdatingStatus(true);
    const { success, error } = await updateReservation({
      ...selectedReservation,
      status: newStatus,
    });

    setIsUpdatingStatus(false);

    if (success) {
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      setSelectedReservation((prev) => (prev ? { ...prev, status: newStatus } : null));
    } else {
      toast.error(error || 'Failed to update status');
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
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {FILTER_STATUSES.map((status) => (
                <Button
                  key={status}
                  variant={activeFilters.includes(status) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter(status)}
                  className="rounded-full h-8 text-xs font-medium px-3 uppercase tracking-wider"
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}
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
                      className={`w-full text-left p-3 rounded-lg transition-colors ${isSelected
                        ? 'bg-primary text-primary-foreground'
                        : isUnread
                          ? 'hover:bg-muted'
                          : 'opacity-70 hover:opacity-90 hover:bg-muted/50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`shrink-0 size-2 rounded-full ${isUnread
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
                            <span
                              className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${r.status === 'PENDING'
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                : r.status === 'CONFIRMED'
                                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                  : r.status === 'COMPLETED'
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}
                            >
                              {r.status.replace('_', ' ')}
                            </span>
                          </div>
                          {lastMsg ? (
                            <div
                              className={`flex items-center justify-between gap-2 mt-2 text-sm ${isSelected ? 'opacity-90' : 'text-muted-foreground'
                                }`}
                            >
                              <span className="truncate min-w-0">{lastMsg.content}</span>
                              <span className="shrink-0 whitespace-nowrap">
                                {new Date(lastMsg.created_at).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <p
                              className={`text-sm mt-2 ${isSelected ? 'opacity-70' : 'text-muted-foreground'
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
                <div className="p-4 border-b shrink-0 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">{selectedReservation.customerName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {getEvent(selectedReservation.eventId)?.name} • Cabin{' '}
                      {selectedReservation.cabinId}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-2 hidden sm:block">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status</p>
                      <p className="text-sm font-medium">{selectedReservation.status.replace('_', ' ')}</p>
                    </div>
                    <Select
                      value={selectedReservation.status}
                      onValueChange={(value) => handleStatusUpdate(value as ReservationStatus)}
                      disabled={isUpdatingStatus}
                    >
                      <SelectTrigger className="w-[140px] h-9">
                        {isUpdatingStatus ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <SelectValue placeholder="Change Status" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                          className={`flex ${m.sender_role === 'employee' ? 'justify-end' : 'justify-start'
                            }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${m.sender_role === 'employee'
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
                    <div ref={messagesEndRef} />
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

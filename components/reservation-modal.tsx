'use client';

import { Reservation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/lib/context';
import { downloadInvoicePDF } from '@/lib/pdf-generator';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReservationModalProps {
  reservation: Reservation | null;
  onClose: () => void;
  onGenerateInvoice?: (invoice: any) => void;
}

export function ReservationModal({
  reservation,
  onClose,
  onGenerateInvoice,
}: ReservationModalProps) {
  const { generateInvoice, getInvoicesByReservation } = useAppContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleGenerateInvoice = async () => {
    if (!reservation) return;
    setIsGenerating(true);
    try {
      const invoice = await generateInvoice(reservation.id);
      if (invoice) {
        onGenerateInvoice?.(invoice);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!reservation) return;
    setIsDownloading(true);
    try {
      const invoices = getInvoicesByReservation(reservation.id);
      if (invoices.length > 0) {
        downloadInvoicePDF(invoices[0], reservation);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={!!reservation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {reservation?.customerName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-mono text-xs">
            {reservation?.id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] p-6 pt-4">
          <div className="space-y-8">
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-xs font-semibold text-primary mb-4 uppercase tracking-wider">
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <InfoItem label="Name" value={reservation?.customerName} />
                <InfoItem label="Email" value={reservation?.customerEmail} />
                <InfoItem label="Phone" value={reservation?.customerPhone} />
                <StatusItem label="Status" value={reservation?.status} />
              </div>
            </section>

            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h3 className="text-xs font-semibold text-primary mb-4 uppercase tracking-wider">
                Reservation Details
              </h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <InfoItem label="Cabin Type" value={reservation?.cabinType} />
                <InfoItem label="Total Guests" value={reservation?.totalGuests} />
                <InfoItem
                  label="Total Price"
                  value={reservation ? `$${reservation.totalPrice.toFixed(2)}` : ''}
                />
                <InfoItem
                  label="Created"
                  value={reservation ? new Date(reservation.createdAt).toLocaleDateString() : ''}
                />
              </div>
            </section>

            <section className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <h3 className="text-xs font-semibold text-primary mb-4 uppercase tracking-wider">
                Passengers
              </h3>
              <div className="space-y-3">
                {reservation?.passengers.map((passenger: any) => (
                  <div key={passenger.id} className="bg-muted/50 border border-border p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium">{passenger.name}</div>
                      <div className="text-muted-foreground text-xs">Age: {passenger.age}</div>
                    </div>
                    {passenger.allergies && passenger.allergies !== 'None' && (
                      <div className="bg-destructive/10 text-destructive px-2 py-1 rounded text-[10px] font-medium border border-destructive/20 uppercase tracking-tighter">
                        Allergy: {passenger.allergies}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {reservation?.notes && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-1000">
                <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  &quot;{reservation.notes}&quot;
                </p>
              </section>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 bg-muted/30 border-t flex items-center justify-end gap-3">
          <Button
            onClick={handleGenerateInvoice}
            disabled={isGenerating || reservation?.invoiceGenerated}
          >
            {isGenerating
              ? 'Generating...'
              : reservation?.invoiceGenerated
                ? 'Invoice Generated'
                : 'Generate Invoice'}
          </Button>
          {reservation?.invoiceGenerated && (
            <Button onClick={handleDownloadInvoice} disabled={isDownloading} variant="outline">
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-400 text-xs font-medium uppercase tracking-tighter">{label}</span>
      <p className="text-slate-900 font-medium">{value}</p>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-400 text-xs font-medium uppercase tracking-tighter">{label}</span>
      <p className="font-bold text-blue-700">{value}</p>
    </div>
  );
}

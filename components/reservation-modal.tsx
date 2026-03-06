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
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-md border-slate-200">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            {reservation?.customerName}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Reservation ID: {reservation?.id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] p-6 pt-4">
          <div className="space-y-8">
            {/* Customer Info */}
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-semibold text-blue-600 mb-4 uppercase tracking-wider">
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <InfoItem label="Name" value={reservation?.customerName} />
                <InfoItem label="Email" value={reservation?.customerEmail} />
                <InfoItem label="Phone" value={reservation?.customerPhone} />
                <StatusItem label="Status" value={reservation?.status} />
              </div>
            </section>

            {/* Reservation Details */}
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h3 className="text-sm font-semibold text-blue-600 mb-4 uppercase tracking-wider">
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

            {/* Passengers */}
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <h3 className="text-sm font-semibold text-blue-600 mb-4 uppercase tracking-wider">
                Passengers
              </h3>
              <div className="space-y-3">
                {reservation?.passengers.map((passenger: any) => (
                  <div key={passenger.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{passenger.name}</div>
                      <div className="text-slate-500 text-xs">Age: {passenger.age}</div>
                    </div>
                    {passenger.allergies && passenger.allergies !== 'None' && (
                      <div className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-[10px] font-medium border border-orange-100 uppercase tracking-tighter">
                        Allergy: {passenger.allergies}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Notes */}
            {reservation?.notes && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-1000">
                <h3 className="text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wider">
                  Notes
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  &quot;{reservation.notes}&quot;
                </p>
              </section>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <Button
            onClick={handleGenerateInvoice}
            disabled={isGenerating || reservation?.invoiceGenerated}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-100 transition-all active:scale-95"
          >
            {isGenerating
              ? 'Generating...'
              : reservation?.invoiceGenerated
                ? 'Invoice Generated'
                : 'Generate Invoice'}
          </Button>
          {reservation?.invoiceGenerated && (
            <Button
              onClick={handleDownloadInvoice}
              disabled={isDownloading}
              variant="outline"
              className="border-slate-300 hover:bg-white text-slate-700 font-medium transition-all active:scale-95"
            >
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

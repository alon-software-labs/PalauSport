import { jsPDF } from 'jspdf';
import { Reservation, Invoice, CruiseEvent } from './types';

export function generateInvoicePDF(invoice: Invoice, reservation: Reservation): any {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [30, 64, 175]; // Tailwind blue-800
  const secondaryColor: [number, number, number] = [107, 114, 128]; // gray-500
  const lightGrayColor: [number, number, number] = [243, 244, 246]; // gray-100
  const lineGrayColor: [number, number, number] = [229, 231, 235]; // gray-200

  // Header -> Logo / Company Name
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('PalauSports', margin, yPos);
  
  // Header -> Title
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', pageWidth - margin, yPos, { align: 'right' });
  
  yPos += 8;

  // Business Location (beside/below logo)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('123 Harbor Street', margin, yPos);
  doc.text('Port City, PC 12345', margin, yPos + 5);
  doc.text('Phone: (555) 123-4567 | Email: info@palausports.com', margin, yPos + 10);

  yPos += 20;

  // Divider
  doc.setDrawColor(...lineGrayColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;

  // Two columns constraint (Invoice Details & Customer Info)
  const colWidth = (pageWidth - margin * 2) / 2;

  // Invoice Details Section (Left)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Invoice Details', margin, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  
  const detailLabelX = margin;
  const detailValueX = margin + 35;
  let detailY = yPos + 8;
  
  doc.text('Invoice Number:', detailLabelX, detailY);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoiceNumber, detailValueX, detailY);
  
  detailY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Booking Ref:', detailLabelX, detailY);
  doc.setTextColor(0, 0, 0);
  doc.text(reservation.id.slice(0, 8).toUpperCase(), detailValueX, detailY);
  
  detailY += 6;
  doc.setTextColor(...secondaryColor);
  doc.text('Date Issued:', detailLabelX, detailY);
  doc.setTextColor(0, 0, 0);
  doc.text(new Date(invoice.generatedAt).toLocaleDateString(), detailValueX, detailY);
  
  detailY += 6;
  doc.setTextColor(...secondaryColor);
  doc.text('Issued By:', detailLabelX, detailY);
  doc.setTextColor(0, 0, 0);
  doc.text('Website Booking', detailValueX, detailY);

  // Customer Info Section (Right)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Customer Info', margin + colWidth, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  
  const custLabelX = margin + colWidth;
  const custValueX = margin + colWidth + 20;
  let custY = yPos + 8;
  
  doc.text('Bill To:', custLabelX, custY);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.customerName, custValueX, custY);
  
  custY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Email:', custLabelX, custY);
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.customerEmail, custValueX, custY);
  
  yPos = Math.max(detailY, custY) + 15;

  // Passenger Details
  if (reservation.passengers && reservation.passengers.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Booking Details', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const maxPassengersPerRow = 2;
    let passengerCount = 0;
    
    reservation.passengers.forEach((passenger, index) => {
      const pName = passenger.name || 'Unknown Passenger';
      const pAge = passenger.age || 'N/A';
      if (passengerCount === maxPassengersPerRow) {
        yPos += 6;
        passengerCount = 0;
      }
      
      const xOffset = margin + (passengerCount * colWidth);
      const allergies = passenger.allergies && passenger.allergies !== 'None' 
        ? ` - Allergies: ${passenger.allergies}`
        : '';
        
      doc.setTextColor(...secondaryColor);
      doc.text(`${index + 1}.`, xOffset, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(`${pName} (Age ${pAge})${allergies}`, xOffset + 5, yPos);
      
      passengerCount++;
    });
    
    yPos += 12;
  }

  // Booking Table Section
  // Table Header Background
  doc.setFillColor(...lightGrayColor);
  doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  const colPositions = {
    desc: margin + 5,
    qty: pageWidth - margin - 80,
    unit: pageWidth - margin - 45,
    amount: pageWidth - margin - 5,
  };

  const tableTop = yPos + 7;
  doc.text('Description', colPositions.desc, tableTop);
  doc.text('Qty', colPositions.qty, tableTop, { align: 'center' });
  doc.text('Unit Price', colPositions.unit, tableTop, { align: 'right' });
  doc.text('Amount', colPositions.amount, tableTop, { align: 'right' });

  yPos += 10;
  
  // Table content
  doc.setFont('helvetica', 'normal');
  yPos += 8;

  const cabinPrices: Record<string, number> = {
    BASIC: 500,
    DELUXE: 750,
    SUITE: 1200,
    PENTHOUSE: 2000,
  };
  
  const unitPrice = cabinPrices[invoice.cabinType] || (invoice.totalGuests > 0 ? invoice.totalPrice / invoice.totalGuests : invoice.totalPrice);
  const quantity = invoice.totalGuests;
  const amount = unitPrice * quantity;

  doc.text(`${invoice.cabinType} Cabin Reservation`, colPositions.desc, yPos);
  doc.text(quantity.toString(), colPositions.qty, yPos, { align: 'center' });
  doc.text(`$${unitPrice.toFixed(2)}`, colPositions.unit, yPos, { align: 'right' });
  doc.text(`$${amount.toFixed(2)}`, colPositions.amount, yPos, { align: 'right' });

  yPos += 6;
  
  // Subtle line separator for table end
  doc.setDrawColor(...lineGrayColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;

  // Summary Section (Subtotal, VAT, Total)
  const summaryX_Label = pageWidth - margin - 35;
  const summaryX_Value = pageWidth - margin; // right edge
  
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text('Subtotal:', summaryX_Label, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text(`$${amount.toFixed(2)}`, summaryX_Value, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setTextColor(...secondaryColor);
  doc.text('VAT (0%):', summaryX_Label, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text('$0.00', summaryX_Value, yPos, { align: 'right' });
  
  yPos += 8;
  
  // Thick line before Total
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(summaryX_Label - 20, yPos - 5, summaryX_Value, yPos - 5);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Total Due:', summaryX_Label, yPos, { align: 'right' });
  doc.text(`$${invoice.totalPrice.toFixed(2)}`, summaryX_Value, yPos, { align: 'right' });

  // Terms & Conditions
  yPos += 20;
  
  // Check if we need to add a page for T&C (T&C needs about 50-60mm of vertical space)
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions:', margin, yPos);
  
  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  
  const termsText = [
    "• Routes: Embark & Disembark at Puerto Princesa Port (Transition 1 embarks at San Pascual, Batangas City).",
    "• Schedule: Embarkation is 1:00 PM - 5:00 PM. Disembarkation strictly by 10:00 AM.",
    "• Included: 11L tank, arrival land transfers, housekeeping, full meals, basic toiletries.",
    "• Excluded: Nitrox, Starlink, bar, park/fuel fees, gear rental, service fees.",
    "• Payment: 30% advance to reserve; 70% balance due 90 days prior. Park & Fuel fees are pre-paid in invoice.",
    "• Cancellations: >90 days: Full refund (less $100). 61-90 days: 50% refund (less $100). 31-60 days: 25% refund (less $100).",
    "  <=30 days or No-Show: No refund. Force Majeure: No refund (use Dive Insurance).",
    "• Dietary: Special diets accommodated based on local availability."
  ].join("\n");
    
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - margin * 2);
  doc.text(splitTerms, margin, yPos);

  // Footer
  yPos = pageHeight - margin - 15;
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(...lineGrayColor);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Thank you for choosing PalauSports!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text('If you have any questions about this invoice, please contact support.', pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(invoice: Invoice, reservation: Reservation) {
  const doc = generateInvoicePDF(invoice, reservation);
  const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function generateBoardingPassesPDF(reservation: Reservation, event?: CruiseEvent): any {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [210, 99],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryColor: [number, number, number] = [30, 64, 175]; // Tailwind blue-800
  const secondaryColor: [number, number, number] = [107, 114, 128]; // gray-500
  const lineGrayColor: [number, number, number] = [229, 231, 235]; // gray-200

  // We iterate through passengers, creating a page per passenger
  if (reservation.passengers && reservation.passengers.length > 0) {
    reservation.passengers.forEach((passenger, index) => {
      const pName = passenger.name || 'Unknown Passenger';
      if (index > 0) {
        doc.addPage();
      }

      // -----------------------------------------------------------------
      // MAIN CARD AREA (Left side)
      // -----------------------------------------------------------------
      // Banner top
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 15, 'F');
      
      const mainSectionWidth = pageWidth - 65; // 145mm for main, 65mm for stub
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('PalauSports', 10, 10);
      
      const ticketNumber = `TKT-${reservation.id.slice(0, 4).toUpperCase()}-${index + 1}`; 
      doc.setFontSize(12);
      // Top right of the whole pass layout (stub)
      doc.text(ticketNumber, pageWidth - 10, 10, { align: 'right' });
      
      // Passenger Name Section
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('PASSENGER NAME', 10, 28);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(pName.toUpperCase(), 10, 36);

      // Routing (From / To) and Cabin / Ref
      let yPos = 48;
      
      const eventName = event?.name || '';
      const isTransition = eventName.toLowerCase().includes('transition');
      const originStr = isTransition ? 'San Pascual, Batangas' : 'Puerto Princesa Port';
      const destStr = event?.destination || 'Puerto Princesa Port';
      
      // Trim origin and destination strings if necessary
      let displayOrigin = originStr.toUpperCase();
      if(displayOrigin.length > 25) displayOrigin = displayOrigin.substring(0,25) + '...';
      let displayDest = destStr.toUpperCase();
      if(displayDest.length > 25) displayDest = displayDest.substring(0,25) + '...';

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('FROM', 10, yPos);
      doc.text('TO', 75, yPos);

      yPos += 6;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(displayOrigin, 10, yPos);
      doc.text(displayDest, 75, yPos);

      yPos += 12;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('CABIN TYPE', 10, yPos);
      doc.text('BOOKING REF', 75, yPos);
      
      yPos += 6;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(reservation.cabinType.toUpperCase(), 10, yPos);
      doc.text(reservation.id.slice(0, 8).toUpperCase(), 75, yPos);
      
      // Special Needs / Allergies
      if (passenger.allergies && passenger.allergies !== 'None') {
        yPos += 12;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red
        doc.text(`SPECIAL REQUEST: Dietary - ${passenger.allergies}`, 10, yPos);
      }

      // -----------------------------------------------------------------
      // PERFORATION LINE
      // -----------------------------------------------------------------
      doc.setDrawColor(...lineGrayColor);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(mainSectionWidth, 0, mainSectionWidth, pageHeight);
      doc.setLineDashPattern([], 0); // reset

      // -----------------------------------------------------------------
      // SCHEDULE STUB (Right side)
      // -----------------------------------------------------------------
      const stubX = mainSectionWidth + 6;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('SCHEDULE', stubX, 10);
      
      const eventDate = event ? new Date(event.date).toLocaleDateString() : 'TBD';
      let arrivalDate = 'TBD';
      if(event && event.date) {
        // Standard liveaboard trips are often ~6 days. Using +6 as the default fallback End Date representation
        const d = new Date(event.date);
        d.setDate(d.getDate() + 6);
        arrivalDate = d.toLocaleDateString();
      }

      let rightY = 28;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('BOARDING DATE', stubX, rightY);
      
      rightY += 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(eventDate, stubX, rightY);
      
      rightY += 12;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('BOARDING TIME', stubX, rightY);
      
      rightY += 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('1:00 PM - 5:00 PM', stubX, rightY);

      rightY += 14;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('ARRIVAL DATE', stubX, rightY);
      
      rightY += 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(arrivalDate, stubX, rightY);

      rightY += 12;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('ARRIVAL TIME', stubX, rightY);
      
      rightY += 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('10:00 AM', stubX, rightY);

    });
  } else {
    // Fallback if no passengers listed
    doc.setFontSize(14);
    doc.text('No passengers found for this reservation.', 20, 20);
  }

  return doc;
}

export function downloadBoardingPassesPDF(reservation: Reservation, event?: CruiseEvent) {
  const doc = generateBoardingPassesPDF(reservation, event);
  const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Import Component, ViewChild, and necessary libraries
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import SignaturePad from 'signature_pad';
import { PDFDocument } from 'pdf-lib';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  src: string | Uint8Array | undefined;
  showSignaturePad = false;
  signatureDataURL: string | undefined;
  signaturePosition: { x: number; y: number } = { x: 100, y: 100 }; // Initial position of signature
  isDragging = false;
  dragOffset = { x: 0, y: 0 };
  pdfContainerElement!: HTMLElement | null;
  signatureSelected = false;
  resizeMode: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null = null;
  resizeStart = { x: 0, y: 0, width: 0, height: 0 };
  signatureWidth: number = 100;
  signatureHeight: number = 50;

  @ViewChild('signaturePadElement') signaturePadElement!: ElementRef<HTMLCanvasElement>;
  signaturePad!: SignaturePad;

  @ViewChild('signatureImage') signatureImage!: ElementRef<HTMLImageElement>;
  @ViewChild('signatureWrapper') signatureWrapper!: ElementRef<HTMLDivElement>;

  signaturePadOptions: Object = {
    minWidth: 0.5,
    maxWidth: 2,
    penColor: 'rgb(0, 0, 0)', // Set pen color
  };


  ngAfterViewInit(): void {
    this.pdfContainerElement = document.querySelector('.pdf-container');
  }


  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          this.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  openSignaturePad(): void {
    this.showSignaturePad = true;
    setTimeout(() => {
      this.initializeSignaturePad();
    }, 0);
  }

  closeSignaturePad(): void {
    this.showSignaturePad = false;
  }

  clearSignaturePad(): void {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }

  saveSignature(): void {
    if (this.signaturePad && !this.signaturePad.isEmpty()) {
      const dataURL = this.signaturePad.toDataURL('image/png');
      this.signatureDataURL = dataURL;
      this.showSignatureOnPdf();
    } else {
      console.error('Signature Pad is empty!');
    }
    this.closeSignaturePad();
  }

  private initializeSignaturePad(): void {
    const canvas = this.signaturePadElement.nativeElement;
    this.signaturePad = new SignaturePad(canvas, this.signaturePadOptions);
  }

  // Display the signature over the PDF as a draggable image
  showSignatureOnPdf(): void {
    if (!this.signatureDataURL) return;
    this.signatureSelected = true;
    setTimeout(() => {
      this.signaturePosition = { x: 100, y: 100 };
      if (this.signatureImage) {
        this.signatureWidth = this.signatureImage.nativeElement.naturalWidth / 2;
        this.signatureHeight = this.signatureImage.nativeElement.naturalHeight / 2;
      }

    }, 0);

  }


  // Download the PDF with the finalized signature position
  async downloadPdf() {
    if (!this.signatureDataURL || !this.src) return;

    try {
      // Load the original PDF document
      const pdfDoc = await PDFDocument.load(this.src as string);

      // Embed the PNG signature image into the PDF
      const pngImage = await pdfDoc.embedPng(this.signatureDataURL);

      // Get the first page of the PDF
      const page = pdfDoc.getPages()[0];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      // Scale the signature to a reasonable size (optional)
      const signatureWidth = pngImage.width / 2;
      const signatureHeight = pngImage.height / 2;

      // Correctly position the signature considering the PDF's coordinate system
      // Get the scale factor for the PDF container
      const pdfContainer = document.querySelector('.pdf-container') as HTMLElement;
      const pdfScale = pdfContainer.getBoundingClientRect().width / pageWidth;

      // Use current position of signature relative to pdf container
      if (!this.signatureWrapper?.nativeElement) {
        console.error('Signature wrapper element not found during download.');
        return;
      }
      const signatureRect = this.signatureWrapper.nativeElement.getBoundingClientRect();
      const containerRect = pdfContainer.getBoundingClientRect();

      const signatureX = (signatureRect.left - containerRect.left) / pdfScale;
      const signatureY = (pageHeight - ((signatureRect.top - containerRect.top) / pdfScale) - signatureHeight);


      // Draw the image at the desired position
      page.drawImage(pngImage, {
        x: signatureX,
        y: signatureY,
        width: signatureWidth,
        height: signatureHeight,
      });

      // Save the modified PDF and create a Blob for downloading
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Create a link to download the PDF
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(pdfBlob);
      downloadLink.download = 'signed-document.pdf';
      downloadLink.click();
    } catch (error) {
      console.error('Error while downloading the PDF:', error);
    }
  }

  // Start dragging the signature
  startDrag(event: MouseEvent): void {
    if (!this.signatureWrapper) return;
    this.signatureSelected = true;
    this.isDragging = true;
    const rect = this.signatureWrapper.nativeElement.getBoundingClientRect();

    // Calculate the offset between the mouse and the image's position
    this.dragOffset.x = event.clientX - rect.left;
    this.dragOffset.y = event.clientY - rect.top;

    // Listen for mouse movement and release
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
  }

  // Handle dragging movement
  drag(event: MouseEvent): void {
    if (!this.isDragging || !this.signatureWrapper) return;

    // Update signature position dynamically
    this.signaturePosition.x = event.clientX - this.dragOffset.x;
    this.signaturePosition.y = event.clientY - this.dragOffset.y;
    this.signatureWrapper.nativeElement.style.left = `${this.signaturePosition.x}px`;
    this.signatureWrapper.nativeElement.style.top = `${this.signaturePosition.y}px`;

  }


  // Stop dragging
  stopDrag(): void {
    this.isDragging = false;

    // Remove listeners to prevent memory leaks
    document.removeEventListener('mousemove', this.drag.bind(this));
    document.removeEventListener('mouseup', this.stopDrag.bind(this));
  }


  deleteSignature(event: MouseEvent): void {
    event.stopPropagation();
    this.signatureDataURL = undefined;
    this.signatureSelected = false;

  }
  startResize(event: MouseEvent, mode: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): void {
    if (!this.signatureWrapper) return;
    event.stopPropagation();
    this.resizeMode = mode;
    const rect = this.signatureWrapper.nativeElement.getBoundingClientRect();
    this.resizeStart = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
    document.addEventListener('mousemove', this.resize.bind(this));
    document.addEventListener('mouseup', this.stopResize.bind(this));

  }


  resize(event: MouseEvent): void {
    if (!this.resizeMode || !this.signatureWrapper) return;
    const deltaX = event.clientX - this.resizeStart.x;
    const deltaY = event.clientY - this.resizeStart.y;
    let newWidth = this.resizeStart.width;
    let newHeight = this.resizeStart.height;
    let newLeft = this.signaturePosition.x;
    let newTop = this.signaturePosition.y;

    switch (this.resizeMode) {
      case 'top-left':
        newWidth = this.resizeStart.width - deltaX;
        newHeight = this.resizeStart.height - deltaY;
        newLeft = this.signaturePosition.x + deltaX;
        newTop = this.signaturePosition.y + deltaY
        break;
      case 'top-right':
        newWidth = this.resizeStart.width + deltaX;
        newHeight = this.resizeStart.height - deltaY;
        newTop = this.signaturePosition.y + deltaY
        break;
      case 'bottom-left':
        newWidth = this.resizeStart.width - deltaX;
        newHeight = this.resizeStart.height + deltaY;
        newLeft = this.signaturePosition.x + deltaX;
        break;
      case 'bottom-right':
        newWidth = this.resizeStart.width + deltaX;
        newHeight = this.resizeStart.height + deltaY;

        break;

    }

    this.signatureWidth = newWidth;
    this.signatureHeight = newHeight;
    this.signaturePosition.x = newLeft;
    this.signaturePosition.y = newTop;
    this.signatureWrapper.nativeElement.style.left = `${newLeft}px`;
    this.signatureWrapper.nativeElement.style.top = `${newTop}px`;

  }
  stopResize(): void {
    this.resizeMode = null;
    document.removeEventListener('mousemove', this.resize.bind(this));
    document.removeEventListener('mouseup', this.stopResize.bind(this));
  }
}
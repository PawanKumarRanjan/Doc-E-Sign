import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';

import { AppComponent } from './app.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    PdfViewerModule, // Import for PDF viewing
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule { }

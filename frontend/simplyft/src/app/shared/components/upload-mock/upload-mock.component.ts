import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Attachment } from '../../../core/models/simplyft.models';

@Component({
  selector: 'app-upload-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="upload-mock">
      <button type="button" class="upload-zone">+ Aggiungi foto</button>
      <div class="attachment-grid">
        <article *ngFor="let file of attachments" class="attachment-tile">
          <div class="photo-thumb"></div>
          <span>{{ file.name }}</span>
          <small>{{ file.validated ? 'Validata' : 'Da verificare' }}</small>
        </article>
      </div>
    </section>
  `
})
export class UploadMockComponent {
  @Input() attachments: Attachment[] = [];
}

import { Injectable, signal } from '@angular/core';
import { Survey } from '../models/simplyft.models';

@Injectable({ providedIn: 'root' })
export class SurveyMockService {
  surveys = signal<Survey[]>([]);
  justSent = signal(false);

  latest(): Survey | undefined {
    return this.surveys()[0];
  }

  sendMockSurvey(): Survey {
    const survey: Survey = {
      id: `s-${Date.now()}`,
      plantId: 'p-101',
      technician: 'Luca Bianchi',
      status: 'sent',
      reliability: 87,
      completedFields: ['Cliente', 'Codice impianto', 'Misure principali', 'Foto quadro', 'Checklist dati obbligatori'],
      missingFields: ['Foto targhetta motore', 'Firma referente'],
      aiSuggestions: [
        'Manca foto targhetta motore',
        'La misura vano sembra incoerente',
        'Componente compatibile trovato a listino'
      ],
      createdAt: '13/05/2026 21:36',
      sentAt: '13/05/2026 21:40',
      notes: 'Rilievo inviato al back-office con dati gia strutturati.',
      voiceNotes: [{ id: 'v-new', title: 'Nota vocale sopralluogo', duration: '01:08', transcript: 'Cliente segnala vibrazione in partenza e porte rumorose.' }],
      attachments: [
        { id: 'a-new-1', name: 'Quadro elettrico.jpg', type: 'photo', url: 'photo', validated: true },
        { id: 'a-new-2', name: 'Bottoniera cabina.jpg', type: 'photo', url: 'photo', validated: true }
      ]
    };
    this.justSent.set(true);
    return survey;
  }
}

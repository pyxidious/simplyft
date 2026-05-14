import { Plant, Quote, Survey, User } from '../models/simplyft.models';

export const MOCK_USERS: User[] = [
  { id: 'u-tech', name: 'Luca Bianchi', role: 'technician', title: 'Tecnico Senior Area Nord', online: true },
  { id: 'u-office', name: 'Giulia Conti', role: 'office', title: 'Back-office commerciale', online: true }
];

export const MOCK_PLANTS: Plant[] = [
  {
    id: 'p-101',
    customer: 'Condominio Aurora',
    address: 'Via Milano 18, Bergamo',
    code: 'BG-AUR-02',
    serial: 'KONE-88X-2041',
    type: 'Ascensore elettrico MRL',
    brand: 'Kone',
    model: 'MonoSpace 500',
    estimatedYear: 2011,
    notes: 'Quadro accessibile, vano stretto, locale macchina assente.',
    completeness: 92,
    status: 'complete',
    lastSurvey: '13/05/2026 09:40',
    attachments: [
      { id: 'a1', name: 'Targhetta quadro.jpg', type: 'photo', url: 'photo', validated: true },
      { id: 'a2', name: 'Vano corsa.jpg', type: 'photo', url: 'photo', validated: true }
    ]
  },
  {
    id: 'p-102',
    customer: 'Officine Riva',
    address: 'Zona Industriale 4, Brescia',
    code: 'BS-RIV-12',
    serial: 'OTIS-PLT-771',
    type: 'Montacarichi industriale',
    brand: 'Otis',
    model: 'GoodsLift H',
    estimatedYear: 2004,
    notes: 'Richiesta sostituzione paracadute e revisione porte.',
    completeness: 68,
    status: 'needs-review',
    lastSurvey: '12/05/2026 16:10',
    attachments: [{ id: 'a3', name: 'Porta piano 2.jpg', type: 'photo', url: 'photo', validated: false }]
  },
  {
    id: 'p-103',
    customer: 'Hotel San Marco',
    address: 'Piazza Roma 7, Verona',
    code: 'VR-HSM-01',
    serial: 'SCH-550-A9',
    type: 'Ascensore idraulico',
    brand: 'Schindler',
    model: '330A',
    estimatedYear: 1998,
    notes: 'Manca foto targhetta motore, cliente richiede preventivo urgente.',
    completeness: 54,
    status: 'incomplete',
    lastSurvey: '11/05/2026 11:25',
    attachments: []
  }
];

export const MOCK_SURVEYS: Survey[] = [
  {
    id: 's-501',
    plantId: 'p-101',
    technician: 'Luca Bianchi',
    status: 'sent',
    reliability: 87,
    completedFields: ['Cliente', 'Codice impianto', 'Marca', 'Misure vano', 'Foto quadro', 'Checklist sicurezza'],
    missingFields: ['Foto targhetta motore', 'Misura fossa verificata'],
    aiSuggestions: [
      'Manca foto targhetta motore',
      'La misura vano sembra incoerente rispetto al modello dichiarato',
      'Componente compatibile trovato a listino: inverter KDL32'
    ],
    createdAt: '13/05/2026 09:10',
    sentAt: '13/05/2026 09:48',
    notes: 'Cliente interessato a modernizzazione quadro e bottoniere.',
    voiceNotes: [{ id: 'v1', title: 'Nota vano corsa', duration: '00:42', transcript: 'Il vano ha guide in buono stato ma staffe da verificare.' }],
    attachments: MOCK_PLANTS[0].attachments
  }
];

export const MOCK_QUOTES: Quote[] = [
  {
    id: 'q-9001',
    surveyId: 's-501',
    customer: 'Condominio Aurora',
    plantCode: 'BG-AUR-02',
    title: 'Modernizzazione quadro e bottoniere',
    status: 'quoting',
    priority: 'Alta',
    assignee: 'Giulia Conti',
    lastUpdated: '13/05/2026 10:18',
    estimatedValue: 18400,
    technicalValidation: 'Da verificare',
    components: [
      { id: 'c1', name: 'Quadro manovra MRL 8 fermate', sku: 'QMRL-8F', compatible: true, confidence: 94, supplier: 'LiftParts EU' },
      { id: 'c2', name: 'Kit bottoniere inox antivandalo', sku: 'BTN-INOX-7', compatible: true, confidence: 88, supplier: 'Elevatech' },
      { id: 'c3', name: 'Inverter KDL32 rigenerativo', sku: 'INV-KDL32', compatible: true, confidence: 81, supplier: 'KDrive' }
    ],
    items: [
      { id: 'i1', description: 'Quadro manovra configurato', quantity: 1, unitCost: 5200, margin: 32 },
      { id: 'i2', description: 'Bottoniere cabina e piano', quantity: 7, unitCost: 420, margin: 28 },
      { id: 'i3', description: 'Installazione e collaudo', quantity: 3, unitCost: 690, margin: 35 }
    ],
    activities: [
      { id: 'l1', actor: 'Luca Bianchi', action: 'Rilievo inviato dal campo con 87% affidabilita', date: '13/05/2026 09:48', tone: 'success' },
      { id: 'l2', actor: 'SimpLyft AI', action: 'Normalizzati 18 campi e rilevati 2 warning', date: '13/05/2026 09:49', tone: 'warning' },
      { id: 'l3', actor: 'Giulia Conti', action: 'Aperta bozza preventivo', date: '13/05/2026 10:18', tone: 'info' }
    ],
    internalComments: ['Verificare foto targhetta motore prima dell invio.', 'Cliente disponibile per sopralluogo integrativo venerdi mattina.']
  },
  {
    id: 'q-9002',
    surveyId: 's-502',
    customer: 'Officine Riva',
    plantCode: 'BS-RIV-12',
    title: 'Adeguamento montacarichi reparto taglio',
    status: 'to-review',
    priority: 'Media',
    assignee: 'Marco Serra',
    lastUpdated: '12/05/2026 17:35',
    estimatedValue: 9700,
    technicalValidation: 'In attesa integrazione',
    components: [],
    items: [{ id: 'i4', description: 'Kit paracadute industriale', quantity: 1, unitCost: 3100, margin: 24 }],
    activities: [{ id: 'l4', actor: 'SimpLyft AI', action: 'Segnalata incongruenza su portata dichiarata', date: '12/05/2026 17:33', tone: 'warning' }],
    internalComments: ['Chiedere foto piastra argano.']
  }
];

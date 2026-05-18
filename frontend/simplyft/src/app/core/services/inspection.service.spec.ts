import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { InspectionDraft, InspectionItem } from '../models/simplyft.models';
import { AuthService } from './auth.service';
import { InspectionService } from './inspection.service';

describe('InspectionService', () => {
  let service: InspectionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InspectionService,
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              id: '1',
              name: 'Luca Bianchi',
              role: 'tecnico',
              title: 'Tecnico',
              online: true
            })
          }
        },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(InspectionService);
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/tecnico/rilievi/bozze').flush([]);
    http.expectOne('/api/tecnico/rilievi').flush([]);
  });

  afterEach(() => {
    http.verify();
  });

  it('keeps formalized descriptions idempotent across repeated formalize clicks', () => {
    const item: InspectionItem = {
      id: 'line-1',
      catalogItemId: '1',
      catalogItemName: 'Porta',
      laborHours: 1,
      materialCost: 0,
      photos: [],
      originalTechnicalDescription: 'Verificare serratura.',
      formalizedDescription: 'Verificare serratura.'
    };
    const outputs: string[] = [];

    for (let click = 1; click <= 4; click++) {
      const currentBeforeClick = item.formalizedDescription ?? '';
      service.formalizeDescription(item).subscribe((text) => {
        item.formalizedDescription = text;
        outputs.push(text);
      });

      const request = http.expectOne('/api/ai/formalize-description');
      expect(request.request.body.originalTechnicalDescription).toBe('Verificare serratura.');
      expect(request.request.body.currentDescription).toBe(currentBeforeClick);
      request.flush({
        formalizedText: `${'Intervento su Porta: '.repeat(click)}Verificare serratura.`
      });
    }

    expect(outputs).toEqual([
      'Intervento su Porta: Verificare serratura.',
      'Intervento su Porta: Verificare serratura.',
      'Intervento su Porta: Verificare serratura.',
      'Intervento su Porta: Verificare serratura.'
    ]);
  });

  it('sends an empty currentDescription when generating a description from scratch', () => {
    const item: InspectionItem = {
      id: 'line-generate',
      catalogItemId: '2',
      catalogItemName: 'Quadro manovra MRL 8 fermate',
      categoryName: 'Quadri di manovra',
      laborHours: 12.5,
      materialCost: 5200,
      photos: [],
      originalTechnicalDescription: 'Fornitura e posa quadro di manovra programmato per impianto MRL.'
    };

    service.formalizeDescription(item).subscribe();

    const request = http.expectOne('/api/ai/formalize-description');
    expect(request.request.body.mode).toBe('GENERATE');
    expect(request.request.body.originalTechnicalDescription).toBe('Fornitura e posa quadro di manovra programmato per impianto MRL.');
    expect(request.request.body.currentDescription).toBe('');
    request.flush({ formalizedText: 'Descrizione generata da zero.' });
  });

  it('propagates IA formalization failures without replacing the existing description', () => {
    const item: InspectionItem = {
      id: 'line-err',
      catalogItemId: '1',
      catalogItemName: 'Porta',
      laborHours: 1,
      materialCost: 0,
      photos: [],
      formalizedDescription: 'Descrizione inserita dal tecnico.'
    };
    let errorStatus = 0;

    service.formalizeDescription(item).subscribe({
      next: () => fail('La formalizzazione non deve produrre fallback su errore backend.'),
      error: (error) => {
        errorStatus = error.status;
      }
    });

    const request = http.expectOne('/api/ai/formalize-description');
    request.flush({ message: 'Formalizzazione IA non riuscita' }, { status: 502, statusText: 'Bad Gateway' });

    expect(errorStatus).toBe(502);
    expect(item.formalizedDescription).toBe('Descrizione inserita dal tecnico.');
  });

  it('submits a new inspection directly as SUBMITTED for commercial review', () => {
    const draft: InspectionDraft = {
      customerId: 'p-1',
      customerName: 'Condominio Aurora',
      plantCode: 'BG-AUR-02',
      status: 'SUBMITTED',
      technicianId: '1',
      technicianName: 'Luca Bianchi',
      items: [{
        id: 'line-local',
        catalogItemId: '10',
        catalogItemName: 'Porta',
        laborHours: 2,
        materialCost: 120,
        photos: [],
        formalizedDescription: 'Sostituzione porta da preventivare.'
      }],
      totalLaborHours: 0,
      totalMaterialCost: 0
    };

    service.submit(draft).subscribe((saved) => {
      expect(saved.status).toBe('SUBMITTED');
    });

    const request = http.expectOne('/api/tecnico/rilievi');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.status).toBe('SUBMITTED');
    expect(request.request.body.items.length).toBe(1);
    expect(request.request.body.totalLaborHours).toBe(2);
    expect(request.request.body.totalMaterialCost).toBe(120);
    request.flush({ ...draft, id: 'insp-42', totalLaborHours: 2, totalMaterialCost: 120 });
  });

  it('submits an existing draft through the persisted submit endpoint', () => {
    const draft: InspectionDraft = {
      id: 'insp-7',
      customerId: 'p-1',
      customerName: 'Condominio Aurora',
      plantCode: 'BG-AUR-02',
      status: 'SUBMITTED',
      technicianId: '1',
      technicianName: 'Luca Bianchi',
      items: [{
        id: 'line-3',
        catalogItemId: '10',
        catalogItemName: 'Porta',
        laborHours: 1,
        materialCost: 50,
        photos: []
      }],
      totalLaborHours: 1,
      totalMaterialCost: 50
    };

    service.submit(draft).subscribe((saved) => {
      expect(saved.status).not.toBe('DRAFT');
    });

    const request = http.expectOne('/api/tecnico/rilievi/insp-7/submit');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.status).toBe('SUBMITTED');
    request.flush(draft);
  });

  it('loads only submitted inspections for commercial review', () => {
    service.listForCommercialReview().subscribe((items) => {
      expect(items.map((item) => item.status)).toEqual(['SUBMITTED']);
      expect(items[0].customerName).toBe('Condominio Aurora');
    });

    const request = http.expectOne('/api/inspections');
    expect(request.request.method).toBe('GET');
    request.flush([{
      id: 'insp-42',
      customerId: 'p-1',
      customerName: 'Condominio Aurora',
      status: 'SUBMITTED',
      technicianId: '1',
      technicianName: 'Luca Bianchi',
      items: [],
      totalLaborHours: 2,
      totalMaterialCost: 120
    }, {
      id: 'insp-43',
      customerId: 'p-2',
      customerName: 'Bozza privata',
      status: 'DRAFT',
      technicianId: '1',
      technicianName: 'Luca Bianchi',
      items: [],
      totalLaborHours: 0,
      totalMaterialCost: 0
    }]);
  });

  it('keeps drafts private to their owner in the technician list', () => {
    service.loadInspections();
    http.expectOne('/api/tecnico/rilievi/bozze').flush([{
      id: 'insp-11',
      customerId: 'p-1',
      customerName: 'Bozza mia',
      status: 'DRAFT',
      technicianId: '1',
      technicianName: 'Luca Bianchi',
      items: [],
      totalLaborHours: 0,
      totalMaterialCost: 0
    }, {
      id: 'insp-12',
      customerId: 'p-2',
      customerName: 'Bozza altro tecnico',
      status: 'DRAFT',
      technicianId: '2',
      technicianName: 'Marco Verdi',
      items: [],
      totalLaborHours: 0,
      totalMaterialCost: 0
    }]);
    http.expectOne('/api/tecnico/rilievi').flush([{
      id: 'insp-13',
      customerId: 'p-3',
      customerName: 'Rilievo inviato',
      status: 'SUBMITTED',
      technicianId: '2',
      technicianName: 'Marco Verdi',
      items: [],
      totalLaborHours: 1,
      totalMaterialCost: 10
    }]);

    expect(service.listForUser('1', 'tecnico').map((item) => item.customerName)).toEqual([
      'Bozza mia',
      'Rilievo inviato'
    ]);
    expect(service.listForUser('1', 'commerciale')).toEqual([]);
  });
});

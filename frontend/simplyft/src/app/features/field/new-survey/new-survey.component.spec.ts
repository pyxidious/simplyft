import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InspectionService } from '../../../core/services/inspection.service';
import { NewSurveyComponent } from './new-survey.component';

describe('NewSurveyComponent', () => {
  let fixture: ComponentFixture<NewSurveyComponent>;
  let component: NewSurveyComponent;
  let inspections: jasmine.SpyObj<InspectionService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    inspections = jasmine.createSpyObj<InspectionService>('InspectionService', [
      'createCatalogItem',
      'getCategories',
      'getDraft',
      'getInspection',
      'saveDraft',
      'searchCatalogItems',
      'searchCustomers',
      'submit'
    ]);
    inspections.getCategories.and.returnValue(of([]));
    inspections.searchCatalogItems.and.returnValue(of([]));
    inspections.searchCustomers.and.returnValue(of([]));
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], { url: '/tecnico/rilievi/nuovo' });

    await TestBed.configureTestingModule({
      imports: [NewSurveyComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } }
        },
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
        { provide: InspectionService, useValue: inspections },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewSurveyComponent);
    component = fixture.componentInstance;
    component.selectedCustomer.set({
      id: 'p-1',
      customerName: 'Condominio Aurora',
      plantCode: 'BG-AUR-02',
      address: 'Via Roma 1'
    });
    component.items.set([{
      id: 'line-local',
      catalogItemId: '10',
      catalogItemName: 'Porta',
      laborHours: 2,
      materialCost: 120,
      photos: [],
      formalizedDescription: 'Sostituzione porta da preventivare.'
    }]);
    inspections.submit.and.returnValue(of({
      id: 'insp-42',
      customerId: 'p-1',
      customerName: 'Condominio Aurora',
      plantCode: 'BG-AUR-02',
      status: 'SUBMITTED',
      technicianId: '1',
      technicianName: 'Luca Bianchi',
      items: component.items(),
      totalLaborHours: 2,
      totalMaterialCost: 120
    }));
    fixture.detectChanges();
  });

  it('clicking Invia submits a complete payload and returns to the technician list', () => {
    const submitRequestButton = fixture.nativeElement.querySelector('.primary-action') as HTMLButtonElement;
    submitRequestButton.click();
    fixture.detectChanges();

    const confirmButton = fixture.nativeElement.querySelector('.bottom-sheet .btn.primary') as HTMLButtonElement;
    confirmButton.click();

    expect(inspections.submit).toHaveBeenCalledTimes(1);
    const payload = inspections.submit.calls.mostRecent().args[0];
    expect(payload.status).toBe('SUBMITTED');
    expect(payload.customerId).toBe('p-1');
    expect(payload.items.length).toBe(1);
    expect(payload.totalLaborHours).toBe(2);
    expect(payload.totalMaterialCost).toBe(120);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tecnico/rilievi', {
      state: { feedback: 'Rilievo inviato al commerciale.' }
    });
  });

  it('shows submitted inspections as read-only without draft or submit actions', () => {
    component.draftId.set('insp-42');
    component.inspectionStatus.set('SUBMITTED');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dettaglio Rilievo');
    expect(fixture.nativeElement.querySelector('app-catalog-object-picker')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Salva bozza"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Invia al commerciale"]')).toBeNull();

    component.saveDraft();
    component.requestSubmit();

    expect(inspections.saveDraft).not.toHaveBeenCalled();
    expect(inspections.submit).not.toHaveBeenCalled();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InspectionService } from '../../../core/services/inspection.service';
import { InspectionsListComponent } from './inspections-list.component';

describe('InspectionsListComponent', () => {
  let fixture: ComponentFixture<InspectionsListComponent>;
  let component: InspectionsListComponent;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    router.getCurrentNavigation.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [InspectionsListComponent],
      providers: [
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
        {
          provide: InspectionService,
          useValue: {
            loading: signal(false),
            error: signal(''),
            listForUser: () => [],
            deleteDraft: () => of(undefined),
            loadInspections: jasmine.createSpy('loadInspections')
          }
        },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InspectionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens drafts in edit mode and submitted inspections in read-only detail mode', () => {
    component.openInspection({
      id: 'insp-1',
      customerId: 'p-1',
      customerName: 'Bozza',
      status: 'DRAFT',
      technicianId: '1',
      technicianName: 'Luca Bianchi',
      items: [],
      totalLaborHours: 0,
      totalMaterialCost: 0
    });
    expect(router.navigate).toHaveBeenCalledWith(['/tecnico/rilievi/bozze', 'insp-1']);

    component.openInspection({
      id: 'insp-2',
      customerId: 'p-2',
      customerName: 'Inviato',
      status: 'IN_REVIEW',
      technicianId: '1',
      technicianName: 'Luca Bianchi',
      items: [],
      totalLaborHours: 1,
      totalMaterialCost: 10
    });
    expect(router.navigate).toHaveBeenCalledWith(['/tecnico/rilievi', 'insp-2']);
  });
});

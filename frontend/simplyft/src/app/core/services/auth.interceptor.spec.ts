import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  const currentUser = signal({
    id: '1',
    name: 'Luca Bianchi',
    role: 'tecnico' as const,
    title: 'Tecnico',
    online: true
  });

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            get token(): string {
              return 'token-tecnico';
            },
            currentUser
          }
        },
        { provide: Router, useValue: router }
      ]
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('adds Authorization to the IA formalize request', () => {
    http.post('/api/ai/formalize-description', { currentDescription: 'testo tecnico' }).subscribe();

    const request = controller.expectOne('/api/ai/formalize-description');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-tecnico');
    request.flush({ formalizedText: 'testo formalizzato' });
  });

  it('does not redirect to login for IA endpoint 401 errors handled by the feature', () => {
    http.post('/api/ai/formalize-description', { currentDescription: 'testo tecnico' }).subscribe({
      error: () => undefined
    });

    const request = controller.expectOne('/api/ai/formalize-description');
    request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});

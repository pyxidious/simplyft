import { Routes } from '@angular/router';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';
import { FieldShellComponent } from './features/field/field-shell/field-shell.component';
import { LoginComponent } from './features/auth/login/login.component';
import { FieldHomeComponent } from './features/field/field-home/field-home.component';
import { PlantDetailComponent } from './features/field/plant-detail/plant-detail.component';
import { PlantsListComponent } from './features/field/plants-list/plants-list.component';
import { NewSurveyComponent } from './features/field/new-survey/new-survey.component';
import { InspectionsListComponent } from './features/field/inspections-list/inspections-list.component';
import { IntegrationsListComponent } from './features/field/integrations-list/integrations-list.component';
import { ReviewConfirmComponent } from './features/field/review-confirm/review-confirm.component';
import { OfficeDashboardComponent } from './features/office/office-dashboard/office-dashboard.component';
import { QuotesListComponent } from './features/office/quotes-list/quotes-list.component';
import { QuoteDetailComponent } from './features/office/quote-detail/quote-detail.component';
import { PipelineComponent } from './features/office/pipeline/pipeline.component';
import { AssignmentsComponent } from './features/office/assignments/assignments.component';
import { RegistryComponent } from './features/office/registry/registry.component';
import { SettingsComponent } from './features/settings/settings.component';
import { authGuard } from './core/services/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  {
    path: 'tecnico',
    component: FieldShellComponent,
    canActivate: [authGuard],
    data: { roles: ['tecnico'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: FieldHomeComponent },
      { path: 'impianti', component: PlantsListComponent },
      { path: 'impianto/:id', component: PlantDetailComponent },
      { path: 'rilievi', component: InspectionsListComponent },
      { path: 'rilievi/nuovo', component: NewSurveyComponent },
      { path: 'rilievi/bozze', component: InspectionsListComponent },
      { path: 'rilievi/bozze/:id', component: NewSurveyComponent },
      { path: 'rilievi/:id', component: NewSurveyComponent },
      { path: 'integrazioni', component: IntegrationsListComponent },
      { path: 'profilo', component: SettingsComponent },
      { path: 'verifica-conferma', component: ReviewConfirmComponent }
    ]
  },
  { path: 'field/home', redirectTo: 'tecnico/home' },
  { path: 'field/rilievi', redirectTo: 'tecnico/rilievi' },
  {
    path: 'commerciale',
    component: AppShellComponent,
    canActivate: [authGuard],
    data: { roles: ['commerciale', 'amministratore'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: OfficeDashboardComponent },
      { path: 'preventivi', component: QuotesListComponent },
      { path: 'preventivo/:id', component: QuoteDetailComponent },
      { path: 'pipeline', component: PipelineComponent },
      { path: 'assegnazioni', component: AssignmentsComponent },
      { path: 'anagrafica', component: RegistryComponent }
    ]
  },
  { path: 'office', redirectTo: 'commerciale/dashboard' },
  { path: 'office/dashboard', redirectTo: 'commerciale/dashboard' },
  { path: 'office/preventivi', redirectTo: 'commerciale/preventivi' },
  { path: 'office/preventivo/:id', redirectTo: 'commerciale/preventivo/:id' },
  { path: 'office/pipeline', redirectTo: 'commerciale/pipeline' },
  { path: 'office/anagrafica', redirectTo: 'commerciale/anagrafica' },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];

import { Routes } from '@angular/router';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';
import { FieldShellComponent } from './features/field/field-shell/field-shell.component';
import { LoginComponent } from './features/auth/login/login.component';
import { FieldHomeComponent } from './features/field/field-home/field-home.component';
import { PlantDetailComponent } from './features/field/plant-detail/plant-detail.component';
import { PlantsListComponent } from './features/field/plants-list/plants-list.component';
import { NewSurveyComponent } from './features/field/new-survey/new-survey.component';
import { InspectionsListComponent } from './features/field/inspections-list/inspections-list.component';
import { ReviewConfirmComponent } from './features/field/review-confirm/review-confirm.component';
import { OfficeDashboardComponent } from './features/office/office-dashboard/office-dashboard.component';
import { QuotesListComponent } from './features/office/quotes-list/quotes-list.component';
import { QuoteDetailComponent } from './features/office/quote-detail/quote-detail.component';
import { PipelineComponent } from './features/office/pipeline/pipeline.component';
import { SettingsComponent } from './features/settings/settings.component';
import { authGuard } from './core/services/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  {
    path: 'field',
    component: FieldShellComponent,
    canActivate: [authGuard],
    data: { roles: ['tecnico', 'amministratore'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: FieldHomeComponent },
      { path: 'impianti', component: PlantsListComponent },
      { path: 'impianto/:id', component: PlantDetailComponent },
      { path: 'rilievi', component: InspectionsListComponent },
      { path: 'nuovo-rilievo', component: NewSurveyComponent },
      { path: 'profilo', component: SettingsComponent },
      { path: 'verifica-conferma', component: ReviewConfirmComponent }
    ]
  },
  {
    path: 'office',
    component: AppShellComponent,
    canActivate: [authGuard],
    data: { roles: ['commerciale', 'amministratore'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: OfficeDashboardComponent },
      { path: 'preventivi', component: QuotesListComponent },
      { path: 'preventivo/:id', component: QuoteDetailComponent },
      { path: 'pipeline', component: PipelineComponent }
    ]
  },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];

import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { LoginPageComponent } from './features/auth/pages/login-page.component';
import { UserManagementPageComponent } from './features/auth/pages/user-management-page.component';
import { ProductionDefectsPageComponent } from './features/production/pages/production-defects-page.component';
import { CatalogManagementPageComponent } from './features/repairs/pages/catalog-management-page.component';
import { RepairEditorPageComponent } from './features/repairs/pages/repair-editor-page.component';
import { RepairViewPageComponent } from './features/repairs/pages/repair-view-page.component';
import { RepairsPageComponent } from './features/repairs/pages/repairs-page.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginPageComponent, data: { mode: 'login' } },
  { path: 'register', component: LoginPageComponent, data: { mode: 'register' } },
  { path: 'forgot-password', component: LoginPageComponent, data: { mode: 'forgot' } },
  { path: '', component: RepairsPageComponent, canActivate: [authGuard] },
  { path: 'production-defects', component: ProductionDefectsPageComponent, canActivate: [authGuard] },
  { path: 'repairs/new', component: RepairEditorPageComponent, canActivate: [authGuard] },
  { path: 'repairs/:id/view', component: RepairViewPageComponent, canActivate: [authGuard] },
  { path: 'repairs/:id/edit', component: RepairEditorPageComponent, canActivate: [authGuard, adminGuard] },
  { path: 'settings/users', component: UserManagementPageComponent, canActivate: [authGuard, adminGuard] },
  { path: 'settings/catalogs/:type', component: CatalogManagementPageComponent, canActivate: [authGuard, adminGuard] },
  { path: 'settings', redirectTo: 'settings/catalogs/top_issue', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];

import { Routes } from '@angular/router';
import { CatalogManagementPageComponent } from './features/repairs/pages/catalog-management-page.component';
import { RepairEditorPageComponent } from './features/repairs/pages/repair-editor-page.component';
import { RepairsPageComponent } from './features/repairs/pages/repairs-page.component';

export const appRoutes: Routes = [
  { path: '', component: RepairsPageComponent },
  { path: 'repairs/new', component: RepairEditorPageComponent },
  { path: 'repairs/:id/edit', component: RepairEditorPageComponent },
  { path: 'settings/catalogs/:type', component: CatalogManagementPageComponent },
  { path: 'settings', redirectTo: 'settings/catalogs/top_issue', pathMatch: 'full' },
];

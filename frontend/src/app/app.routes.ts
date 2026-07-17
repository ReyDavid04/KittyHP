import { Routes } from '@angular/router';
import { RepairsPageComponent } from './features/repairs/pages/repairs-page.component';
import { RepairEditorPageComponent } from './features/repairs/pages/repair-editor-page.component';

export const appRoutes: Routes = [
	{ path: '', component: RepairsPageComponent },
	{ path: 'repairs/new', component: RepairEditorPageComponent },
	{ path: 'repairs/:id/edit', component: RepairEditorPageComponent },
];

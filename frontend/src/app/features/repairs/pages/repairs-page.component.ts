import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import { RepairFormComponent } from '../components/repair-form.component';
import { RepairListComponent } from '../components/repair-list.component';

@Component({
  standalone: true,
  imports: [CommonModule, AsyncPipe, RepairFormComponent, RepairListComponent],
  template: `
    <section class="panel">
      <app-repair-form></app-repair-form>
      <app-repair-list [repairs]="repairReportsApi.getAll() | async"></app-repair-list>
    </section>
  `,
  styles: [
    `
      .panel {
        display: grid;
        gap: 24px;
      }
    `,
  ],
})
export class RepairsPageComponent {
  readonly repairReportsApi = inject(RepairReportsApiService);
}

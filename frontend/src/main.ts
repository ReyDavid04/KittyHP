import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

function updateCatalogResultsCounter(): void {
  const catalogPage = document.querySelector<HTMLElement>('.catalog-page');

  if (!catalogPage) {
    return;
  }

  const searchRow = catalogPage.querySelector<HTMLElement>('.search-row');
  const searchInput = catalogPage.querySelector<HTMLInputElement>('.search-field input');
  const totalLabel = catalogPage.querySelector<HTMLElement>('.item-count');

  if (!searchRow || !totalLabel) {
    return;
  }

  const total = Number(totalLabel.textContent?.match(/\d+/)?.[0] ?? 0);
  const visible = Array.from(catalogPage.querySelectorAll<HTMLTableRowElement>('tbody > tr'))
    .filter((row) => !row.querySelector('.no-results'))
    .length;

  let counter = searchRow.querySelector<HTMLElement>('.catalog-results-count');

  if (!counter) {
    counter = document.createElement('span');
    counter.className = 'search-count catalog-results-count';
    searchRow.appendChild(counter);
  }

  const recordLabel = total === 1 ? 'registro' : 'registros';
  const hasActiveSearch = Boolean(searchInput?.value.trim());
  const nextText = hasActiveSearch
    ? `${visible} de ${total} ${recordLabel}`
    : `${total} ${recordLabel}`;

  if (counter.textContent !== nextText) {
    counter.textContent = nextText;
  }
}

function setDefaultRepairDate(): void {
  if (!window.location.pathname.endsWith('/repairs/new')) {
    return;
  }

  const dateInput = document.querySelector<HTMLInputElement>(
    'app-repair-form input[formcontrolname="recordDate"]',
  );

  if (!dateInput || dateInput.value) {
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  dateInput.value = `${year}-${month}-${day}`;
  dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  dateInput.dispatchEvent(new Event('change', { bubbles: true }));
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    document.addEventListener('click', (event) => {
      const openCatalogMenu = document.querySelector<HTMLDetailsElement>('.settings-menu[open]');
      const target = event.target as Node | null;

      if (openCatalogMenu && target && !openCatalogMenu.contains(target)) {
        openCatalogMenu.open = false;
      }
    });

    let updateScheduled = false;
    const scheduleUiUpdate = (): void => {
      if (updateScheduled) {
        return;
      }

      updateScheduled = true;
      requestAnimationFrame(() => {
        updateScheduled = false;
        updateCatalogResultsCounter();
        setDefaultRepairDate();
      });
    };

    document.addEventListener('input', (event) => {
      const target = event.target as Element | null;

      if (target?.matches('.catalog-page .search-field input')) {
        scheduleUiUpdate();
      }
    });

    const observer = new MutationObserver(scheduleUiUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    scheduleUiUpdate();
  })
  .catch((error) => console.error(error));

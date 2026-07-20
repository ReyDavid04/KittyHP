import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

function updateCatalogResultsCounter(): void {
  const catalogPage = document.querySelector<HTMLElement>('.catalog-page');

  if (!catalogPage) {
    return;
  }

  const searchRow = catalogPage.querySelector<HTMLElement>('.search-row');
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

  const nextText = `${visible} de ${total} resultados`;

  if (counter.textContent !== nextText) {
    counter.textContent = nextText;
  }
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
    const scheduleCatalogCounterUpdate = (): void => {
      if (updateScheduled) {
        return;
      }

      updateScheduled = true;
      requestAnimationFrame(() => {
        updateScheduled = false;
        updateCatalogResultsCounter();
      });
    };

    document.addEventListener('input', (event) => {
      const target = event.target as Element | null;

      if (target?.matches('.catalog-page .search-field input')) {
        scheduleCatalogCounterUpdate();
      }
    });

    const observer = new MutationObserver(scheduleCatalogCounterUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    scheduleCatalogCounterUpdate();
  })
  .catch((error) => console.error(error));

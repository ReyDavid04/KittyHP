import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const SEARCHABLE_CATALOG_FIELDS: Record<string, string> = {
  topIssue: 'Escribe o selecciona el top issue',
  category: 'Escribe o selecciona la categoría',
  majorPart: 'Escribe o selecciona la parte principal',
  failureFactor: 'Escribe o selecciona el factor de falla',
};

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

function ensureSearchableCatalogStyles(): void {
  if (document.getElementById('repair-searchable-catalog-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'repair-searchable-catalog-styles';
  style.textContent = `
    app-repair-form .catalog-native-select {
      display: none !important;
    }

    app-repair-form .catalog-search-input {
      width: 100%;
      height: 46px;
      padding: 0 42px 0 14px !important;
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      font-size: 0.82rem;
      font-weight: 450;
      background-color: var(--surface-subtle);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2368758a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='10.5' cy='10.5' r='5.5'/%3E%3Cpath d='m15 15 4.5 4.5'/%3E%3C/svg%3E");
      background-position: right 14px center;
      background-repeat: no-repeat;
      background-size: 17px 17px;
      transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
    }

    app-repair-form .catalog-search-input::placeholder {
      color: #98a3b2;
    }

    app-repair-form .catalog-search-input:hover {
      border-color: var(--border-strong);
      background-color: #fff;
    }

    app-repair-form .catalog-search-input:focus {
      border-color: rgba(47, 126, 199, 0.7);
      background-color: #fff;
      box-shadow: 0 0 0 3px rgba(47, 126, 199, 0.1);
    }

    app-repair-form .catalog-search-input.catalog-value-invalid {
      border-color: rgba(180, 35, 58, 0.65);
      background-color: #fffafb;
    }

    app-repair-form .catalog-search-input:disabled {
      opacity: 0.65;
      cursor: wait;
    }
  `;
  document.head.appendChild(style);
}

function catalogOptions(select: HTMLSelectElement): HTMLOptionElement[] {
  return Array.from(select.options).filter((option) => Boolean(option.value));
}

function exactCatalogOption(select: HTMLSelectElement, value: string): HTMLOptionElement | undefined {
  const normalizedValue = value.trim().toLocaleLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  return catalogOptions(select).find(
    (option) => option.value.trim().toLocaleLowerCase() === normalizedValue,
  );
}

function synchronizeCatalogSelect(
  select: HTMLSelectElement,
  input: HTMLInputElement,
  datalist: HTMLDataListElement,
): void {
  const options = catalogOptions(select);
  const optionValues = options.map((option) => option.value);
  const currentDatalistValues = Array.from(datalist.options).map((option) => option.value);

  if (optionValues.join('\u0000') !== currentDatalistValues.join('\u0000')) {
    datalist.replaceChildren(
      ...optionValues.map((value) => {
        const option = document.createElement('option');
        option.value = value;
        return option;
      }),
    );
  }

  input.disabled = select.disabled;

  if (document.activeElement !== input && input.value !== select.value) {
    input.value = select.value;
    input.classList.remove('catalog-value-invalid');
  }
}

function initializeSearchableCatalogSelects(): void {
  ensureSearchableCatalogStyles();

  const selects = document.querySelectorAll<HTMLSelectElement>(
    'app-repair-form select[formcontrolname]',
  );

  selects.forEach((select) => {
    const controlName = select.getAttribute('formcontrolname') ?? '';
    const placeholder = SEARCHABLE_CATALOG_FIELDS[controlName];

    if (!placeholder) {
      return;
    }

    const existingInputId = select.dataset['searchableInputId'];

    if (existingInputId) {
      const existingInput = document.getElementById(existingInputId) as HTMLInputElement | null;
      const existingDatalist = document.getElementById(`${existingInputId}-options`) as HTMLDataListElement | null;

      if (existingInput && existingDatalist) {
        synchronizeCatalogSelect(select, existingInput, existingDatalist);
        return;
      }
    }

    const uniqueId = `repair-${controlName}-catalog-search`;
    const input = document.createElement('input');
    const datalist = document.createElement('datalist');
    const label = select.closest<HTMLLabelElement>('label');

    input.id = uniqueId;
    input.type = 'text';
    input.className = 'catalog-search-input';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.setAttribute('list', `${uniqueId}-options`);
    input.setAttribute('aria-label', placeholder);

    datalist.id = `${uniqueId}-options`;

    select.classList.add('catalog-native-select');
    select.dataset['searchableInputId'] = uniqueId;
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    label?.setAttribute('for', uniqueId);
    select.before(input, datalist);

    input.addEventListener('focus', () => {
      input.classList.remove('catalog-value-invalid');
    });

    input.addEventListener('input', () => {
      const matchingOption = exactCatalogOption(select, input.value);
      const nextValue = matchingOption?.value ?? '';

      if (select.value !== nextValue) {
        select.value = nextValue;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }

      input.classList.remove('catalog-value-invalid');
    });

    input.addEventListener('blur', () => {
      const matchingOption = exactCatalogOption(select, input.value);

      if (matchingOption) {
        input.value = matchingOption.value;
        input.classList.remove('catalog-value-invalid');
        return;
      }

      if (input.value.trim()) {
        input.classList.add('catalog-value-invalid');
      }
    });

    synchronizeCatalogSelect(select, input, datalist);
  });
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
        initializeSearchableCatalogSelects();
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

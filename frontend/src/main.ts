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

    app-repair-form .catalog-autocomplete {
      position: relative;
      width: 100%;
      min-width: 0;
    }

    app-repair-form .catalog-autocomplete.open {
      z-index: 90;
    }

    app-repair-form .catalog-search-input {
      width: 100% !important;
      height: 46px !important;
      padding: 0 72px 0 14px !important;
      border: 1px solid var(--border) !important;
      border-radius: 10px !important;
      color: var(--text) !important;
      font-size: 0.82rem !important;
      font-weight: 450 !important;
      background: var(--surface-subtle) !important;
      transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease !important;
    }

    app-repair-form .catalog-search-input::placeholder {
      color: #98a3b2 !important;
    }

    app-repair-form .catalog-search-input:hover {
      border-color: var(--border-strong) !important;
      background: #fff !important;
    }

    app-repair-form .catalog-search-input:focus,
    app-repair-form .catalog-autocomplete.open .catalog-search-input {
      border-color: rgba(47, 126, 199, 0.72) !important;
      background: #fff !important;
      box-shadow: 0 0 0 3px rgba(47, 126, 199, 0.1) !important;
    }

    app-repair-form .catalog-search-input.catalog-value-invalid {
      border-color: rgba(180, 35, 58, 0.65) !important;
      background: #fffafb !important;
    }

    app-repair-form .catalog-search-input:disabled {
      opacity: 0.65;
      cursor: wait;
    }

    app-repair-form .catalog-search-icon {
      position: absolute;
      top: 50%;
      right: 14px;
      width: 17px;
      height: 17px;
      color: #6f7d90;
      pointer-events: none;
      transform: translateY(-50%);
    }

    app-repair-form .catalog-search-icon svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    app-repair-form .catalog-toggle {
      position: absolute;
      top: 50%;
      right: 38px;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      border-radius: 7px;
      color: #536176;
      background: transparent;
      cursor: pointer;
      transform: translateY(-50%);
      transition: color 140ms ease, background 140ms ease;
    }

    app-repair-form .catalog-toggle:hover {
      color: var(--primary);
      background: var(--primary-soft);
    }

    app-repair-form .catalog-toggle svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
      transition: transform 150ms ease;
    }

    app-repair-form .catalog-autocomplete.open .catalog-toggle svg {
      transform: rotate(180deg);
    }

    app-repair-form .catalog-options-panel {
      position: absolute;
      top: calc(100% + 7px);
      right: 0;
      left: 0;
      z-index: 100;
      max-height: 230px;
      overflow-y: auto;
      padding: 6px;
      border: 1px solid #dbe4ee;
      border-radius: 11px;
      background: #fff;
      box-shadow: 0 16px 36px rgba(15, 32, 51, 0.16);
      overscroll-behavior: contain;
    }

    app-repair-form .catalog-options-panel[hidden] {
      display: none !important;
    }

    app-repair-form .catalog-options-panel::-webkit-scrollbar {
      width: 7px;
    }

    app-repair-form .catalog-options-panel::-webkit-scrollbar-thumb {
      border: 2px solid #fff;
      border-radius: 999px;
      background: #cbd5e1;
    }

    app-repair-form .catalog-option {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      min-height: 40px;
      margin: 1px 0;
      padding: 9px 11px;
      border: 1px solid transparent;
      border-radius: 8px;
      color: #263449;
      font-size: 0.78rem;
      font-weight: 650;
      line-height: 1.3;
      text-align: left;
      background: transparent;
      cursor: pointer;
      transition: color 130ms ease, background 130ms ease, border-color 130ms ease;
    }

    app-repair-form .catalog-option:hover,
    app-repair-form .catalog-option.keyboard-active {
      color: var(--primary);
      border-color: rgba(47, 126, 199, 0.1);
      background: #f2f7fd;
    }

    app-repair-form .catalog-option.selected {
      color: var(--primary);
      background: var(--primary-soft);
    }

    app-repair-form .catalog-option-text {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    app-repair-form .catalog-option mark {
      padding: 0;
      color: inherit;
      font-weight: 800;
      background: transparent;
    }

    app-repair-form .catalog-option-check {
      flex: 0 0 auto;
      width: 16px;
      height: 16px;
      color: var(--primary);
    }

    app-repair-form .catalog-option-check svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    app-repair-form .catalog-empty-option {
      display: grid;
      place-items: center;
      min-height: 72px;
      padding: 14px;
      color: var(--muted);
      font-size: 0.74rem;
      font-weight: 550;
      text-align: center;
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

function filteredCatalogOptions(select: HTMLSelectElement, query: string): HTMLOptionElement[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const options = catalogOptions(select);

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => option.value.toLocaleLowerCase().includes(normalizedQuery));
}

function createHighlightedOptionText(value: string, query: string): HTMLElement {
  const container = document.createElement('span');
  container.className = 'catalog-option-text';
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchIndex = normalizedQuery ? value.toLocaleLowerCase().indexOf(normalizedQuery) : -1;

  if (matchIndex < 0) {
    container.textContent = value;
    return container;
  }

  container.append(document.createTextNode(value.slice(0, matchIndex)));
  const mark = document.createElement('mark');
  mark.textContent = value.slice(matchIndex, matchIndex + normalizedQuery.length);
  container.append(mark, document.createTextNode(value.slice(matchIndex + normalizedQuery.length)));
  return container;
}

function setCatalogPanelOpen(wrapper: HTMLElement, open: boolean): void {
  const input = wrapper.querySelector<HTMLInputElement>('.catalog-search-input');
  const panel = wrapper.querySelector<HTMLElement>('.catalog-options-panel');

  if (!input || !panel) {
    return;
  }

  wrapper.classList.toggle('open', open);
  panel.hidden = !open;
  input.setAttribute('aria-expanded', String(open));

  if (!open) {
    wrapper.dataset['activeIndex'] = '-1';
  }
}

function setActiveCatalogOption(wrapper: HTMLElement, requestedIndex: number): void {
  const options = Array.from(wrapper.querySelectorAll<HTMLButtonElement>('.catalog-option'));

  if (!options.length) {
    wrapper.dataset['activeIndex'] = '-1';
    return;
  }

  const index = Math.max(0, Math.min(requestedIndex, options.length - 1));
  wrapper.dataset['activeIndex'] = String(index);
  options.forEach((option, optionIndex) => option.classList.toggle('keyboard-active', optionIndex === index));
  options[index].scrollIntoView({ block: 'nearest' });
}

function chooseCatalogValue(
  select: HTMLSelectElement,
  input: HTMLInputElement,
  wrapper: HTMLElement,
  value: string,
): void {
  input.value = value;
  input.classList.remove('catalog-value-invalid');

  if (select.value !== value) {
    select.value = value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  renderCatalogOptions(select, input, wrapper);
  setCatalogPanelOpen(wrapper, false);
  input.focus();
}

function renderCatalogOptions(
  select: HTMLSelectElement,
  input: HTMLInputElement,
  wrapper: HTMLElement,
): void {
  const panel = wrapper.querySelector<HTMLElement>('.catalog-options-panel');

  if (!panel) {
    return;
  }

  const options = filteredCatalogOptions(select, input.value);
  panel.replaceChildren();

  if (!options.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'catalog-empty-option';
    emptyState.textContent = 'No se encontraron opciones.';
    panel.appendChild(emptyState);
    wrapper.dataset['activeIndex'] = '-1';
    return;
  }

  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-option';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(select.value === option.value));
    button.classList.toggle('selected', select.value === option.value);
    button.appendChild(createHighlightedOptionText(option.value, input.value));

    if (select.value === option.value) {
      const check = document.createElement('span');
      check.className = 'catalog-option-check';
      check.setAttribute('aria-hidden', 'true');
      check.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"></path></svg>';
      button.appendChild(check);
    }

    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => chooseCatalogValue(select, input, wrapper, option.value));
    panel.appendChild(button);
  });

  const selectedIndex = options.findIndex((option) => option.value === select.value);
  wrapper.dataset['activeIndex'] = String(selectedIndex >= 0 ? selectedIndex : 0);
  setActiveCatalogOption(wrapper, selectedIndex >= 0 ? selectedIndex : 0);
}

function synchronizeCatalogSelect(
  select: HTMLSelectElement,
  input: HTMLInputElement,
  wrapper: HTMLElement,
): void {
  input.disabled = select.disabled;

  if (document.activeElement !== input && input.value !== select.value) {
    input.value = select.value;
    input.classList.remove('catalog-value-invalid');
  }

  if (wrapper.classList.contains('open')) {
    renderCatalogOptions(select, input, wrapper);
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
      const existingWrapper = existingInput?.closest<HTMLElement>('.catalog-autocomplete') ?? null;

      if (existingInput && existingWrapper) {
        synchronizeCatalogSelect(select, existingInput, existingWrapper);
        return;
      }
    }

    const uniqueId = `repair-${controlName}-catalog-search`;
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    const toggle = document.createElement('button');
    const searchIcon = document.createElement('span');
    const panel = document.createElement('div');
    const label = select.closest<HTMLLabelElement>('label');

    wrapper.className = 'catalog-autocomplete';
    wrapper.dataset['activeIndex'] = '-1';

    input.id = uniqueId;
    input.type = 'text';
    input.className = 'catalog-search-input';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', placeholder);
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', `${uniqueId}-options`);
    input.setAttribute('aria-expanded', 'false');

    toggle.type = 'button';
    toggle.className = 'catalog-toggle';
    toggle.setAttribute('aria-label', 'Mostrar opciones');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>';

    searchIcon.className = 'catalog-search-icon';
    searchIcon.setAttribute('aria-hidden', 'true');
    searchIcon.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="m15 15 4.5 4.5"></path></svg>';

    panel.id = `${uniqueId}-options`;
    panel.className = 'catalog-options-panel';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;

    select.classList.add('catalog-native-select');
    select.dataset['searchableInputId'] = uniqueId;
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    label?.setAttribute('for', uniqueId);
    wrapper.append(input, toggle, searchIcon, panel);
    select.before(wrapper);

    const openPanel = (): void => {
      renderCatalogOptions(select, input, wrapper);
      setCatalogPanelOpen(wrapper, true);
    };

    input.addEventListener('focus', () => {
      input.classList.remove('catalog-value-invalid');
      openPanel();
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
      renderCatalogOptions(select, input, wrapper);
      setCatalogPanelOpen(wrapper, true);
    });

    input.addEventListener('keydown', (event) => {
      const isOpen = wrapper.classList.contains('open');
      const currentIndex = Number(wrapper.dataset['activeIndex'] ?? -1);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!isOpen) {
          openPanel();
        }
        setActiveCatalogOption(wrapper, currentIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) {
          openPanel();
        }
        setActiveCatalogOption(wrapper, currentIndex <= 0 ? 0 : currentIndex - 1);
        return;
      }

      if (event.key === 'Enter' && isOpen) {
        const activeOption = wrapper.querySelector<HTMLButtonElement>('.catalog-option.keyboard-active');
        if (activeOption) {
          event.preventDefault();
          activeOption.click();
        }
        return;
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setCatalogPanelOpen(wrapper, false);
      }
    });

    input.addEventListener('blur', () => {
      window.setTimeout(() => {
        const matchingOption = exactCatalogOption(select, input.value);

        if (matchingOption) {
          input.value = matchingOption.value;
          input.classList.remove('catalog-value-invalid');
        } else if (input.value.trim()) {
          input.classList.add('catalog-value-invalid');
        }

        setCatalogPanelOpen(wrapper, false);
      }, 80);
    });

    toggle.addEventListener('mousedown', (event) => event.preventDefault());
    toggle.addEventListener('click', () => {
      if (wrapper.classList.contains('open')) {
        setCatalogPanelOpen(wrapper, false);
      } else {
        input.focus();
        openPanel();
      }
    });

    synchronizeCatalogSelect(select, input, wrapper);
  });
}

function closeOpenCatalogAutocompletes(target: Node | null): void {
  document.querySelectorAll<HTMLElement>('app-repair-form .catalog-autocomplete.open').forEach((wrapper) => {
    if (!target || !wrapper.contains(target)) {
      setCatalogPanelOpen(wrapper, false);
    }
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

      closeOpenCatalogAutocompletes(target);
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

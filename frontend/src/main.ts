import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const SEARCHABLE_CATALOG_FIELDS: Record<string, string> = {
  family: 'Escribe o selecciona Family',
  topIssue: 'Escribe o selecciona el top issue',
  category: 'Escribe o selecciona la categoría',
  majorPart: 'Escribe o selecciona la parte principal',
  failureFactor: 'Escribe o selecciona el factor de falla',
};

function updateCatalogResultsCounter(): void {
  const page = document.querySelector<HTMLElement>('.catalog-page');
  const searchRow = page?.querySelector<HTMLElement>('.search-row');
  const searchInput = page?.querySelector<HTMLInputElement>('.search-field input');
  const totalLabel = page?.querySelector<HTMLElement>('.item-count');

  if (!page || !searchRow || !totalLabel) return;

  const total = Number(totalLabel.textContent?.match(/\d+/)?.[0] ?? 0);
  const visible = Array.from(page.querySelectorAll<HTMLTableRowElement>('tbody > tr'))
    .filter((row) => !row.querySelector('.no-results')).length;
  let counter = searchRow.querySelector<HTMLElement>('.catalog-results-count');

  if (!counter) {
    counter = document.createElement('span');
    counter.className = 'search-count catalog-results-count';
    searchRow.appendChild(counter);
  }

  const label = total === 1 ? 'registro' : 'registros';
  counter.textContent = searchInput?.value.trim() ? `${visible} de ${total} ${label}` : `${total} ${label}`;
}

function setDefaultRepairDate(): void {
  if (!window.location.pathname.endsWith('/repairs/new')) return;

  const input = document.querySelector<HTMLInputElement>('app-repair-form input[formcontrolname="recordDate"]');
  if (!input || input.value) return;

  const today = new Date();
  input.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function ensureAutocompleteStyles(): void {
  if (document.getElementById('repair-catalog-autocomplete-styles')) return;

  const style = document.createElement('style');
  style.id = 'repair-catalog-autocomplete-styles';
  style.textContent = `
    app-repair-form .catalog-native-select { display: none !important; }
    app-repair-form .catalog-autocomplete { position: relative; width: 100%; min-width: 0; }
    app-repair-form .catalog-autocomplete.open { z-index: 90; }
    app-repair-form .catalog-search-input {
      width: 100% !important; height: 46px !important; padding: 0 72px 0 14px !important;
      border: 1px solid var(--border) !important; border-radius: 10px !important;
      color: var(--text) !important; font-size: .82rem !important; font-weight: 450 !important;
      background: var(--surface-subtle) !important; transition: 150ms ease !important;
    }
    app-repair-form .catalog-search-input::placeholder { color: #98a3b2 !important; }
    app-repair-form .catalog-search-input:hover { border-color: var(--border-strong) !important; background: #fff !important; }
    app-repair-form .catalog-search-input:focus,
    app-repair-form .catalog-autocomplete.open .catalog-search-input {
      border-color: rgba(47,126,199,.72) !important; background: #fff !important;
      box-shadow: 0 0 0 3px rgba(47,126,199,.1) !important;
    }
    app-repair-form .catalog-search-input.catalog-value-invalid { border-color: rgba(180,35,58,.65) !important; background: #fffafb !important; }
    app-repair-form .catalog-search-input:disabled { opacity: .65; cursor: wait; }
    app-repair-form .catalog-search-icon { position: absolute; top: 50%; right: 14px; width: 17px; height: 17px; color: #6f7d90; pointer-events: none; transform: translateY(-50%); }
    app-repair-form .catalog-search-icon svg,
    app-repair-form .catalog-toggle svg,
    app-repair-form .catalog-option-check svg { display: block; width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; }
    app-repair-form .catalog-search-icon svg { stroke-width: 1.8; }
    app-repair-form .catalog-toggle {
      position: absolute; top: 50%; right: 38px; display: grid; place-items: center;
      width: 28px; height: 28px; padding: 0; border: 0; border-radius: 7px;
      color: #536176; background: transparent; cursor: pointer; transform: translateY(-50%);
    }
    app-repair-form .catalog-toggle:hover { color: var(--primary); background: var(--primary-soft); }
    app-repair-form .catalog-toggle svg { width: 14px; height: 14px; stroke-width: 2; transition: transform 150ms ease; }
    app-repair-form .catalog-autocomplete.open .catalog-toggle svg { transform: rotate(180deg); }
    app-repair-form .catalog-options-panel {
      position: absolute; top: calc(100% + 7px); right: 0; left: 0; z-index: 100;
      max-height: 230px; overflow-y: auto; padding: 6px; border: 1px solid #dbe4ee;
      border-radius: 11px; background: #fff; box-shadow: 0 16px 36px rgba(15,32,51,.16);
      overscroll-behavior: contain;
    }
    app-repair-form .catalog-options-panel[hidden] { display: none !important; }
    app-repair-form .catalog-option {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      width: 100%; min-height: 40px; margin: 1px 0; padding: 9px 11px;
      border: 1px solid transparent; border-radius: 8px; color: #263449;
      font-size: .78rem; font-weight: 650; line-height: 1.3; text-align: left;
      background: transparent; cursor: pointer; transition: 130ms ease;
    }
    app-repair-form .catalog-option:hover,
    app-repair-form .catalog-option.keyboard-active { color: var(--primary); border-color: rgba(47,126,199,.1); background: #f2f7fd; }
    app-repair-form .catalog-option.selected { color: var(--primary); background: var(--primary-soft); }
    app-repair-form .catalog-option-text { min-width: 0; overflow-wrap: anywhere; }
    app-repair-form .catalog-option mark { padding: 0; color: inherit; font-weight: 800; background: transparent; }
    app-repair-form .catalog-option-check { flex: 0 0 auto; width: 16px; height: 16px; color: var(--primary); }
    app-repair-form .catalog-option-check svg { stroke-width: 2; }
    app-repair-form .catalog-empty-option { display: grid; place-items: center; min-height: 72px; padding: 14px; color: var(--muted); font-size: .74rem; text-align: center; }
  `;
  document.head.appendChild(style);
}

function availableOptions(select: HTMLSelectElement): HTMLOptionElement[] {
  return Array.from(select.options).filter((option) => Boolean(option.value));
}

function exactOption(select: HTMLSelectElement, value: string): HTMLOptionElement | undefined {
  const normalized = value.trim().toLocaleLowerCase();
  return normalized ? availableOptions(select).find((option) => option.value.trim().toLocaleLowerCase() === normalized) : undefined;
}

function matchingOptions(select: HTMLSelectElement, value: string): HTMLOptionElement[] {
  const normalized = value.trim().toLocaleLowerCase();
  return normalized ? availableOptions(select).filter((option) => option.value.toLocaleLowerCase().includes(normalized)) : availableOptions(select);
}

function highlightedText(value: string, query: string): HTMLElement {
  const element = document.createElement('span');
  element.className = 'catalog-option-text';
  const normalized = query.trim().toLocaleLowerCase();
  const index = normalized ? value.toLocaleLowerCase().indexOf(normalized) : -1;

  if (index < 0) {
    element.textContent = value;
    return element;
  }

  element.append(document.createTextNode(value.slice(0, index)));
  const mark = document.createElement('mark');
  mark.textContent = value.slice(index, index + normalized.length);
  element.append(mark, document.createTextNode(value.slice(index + normalized.length)));
  return element;
}

function setPanelOpen(wrapper: HTMLElement, open: boolean): void {
  const input = wrapper.querySelector<HTMLInputElement>('.catalog-search-input');
  const panel = wrapper.querySelector<HTMLElement>('.catalog-options-panel');
  if (!input || !panel) return;

  wrapper.classList.toggle('open', open);
  panel.hidden = !open;
  input.setAttribute('aria-expanded', String(open));
  if (!open) wrapper.dataset['activeIndex'] = '-1';
}

function setActiveOption(wrapper: HTMLElement, requestedIndex: number): void {
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

function renderOptions(select: HTMLSelectElement, input: HTMLInputElement, wrapper: HTMLElement): void {
  const panel = wrapper.querySelector<HTMLElement>('.catalog-options-panel');
  if (!panel) return;

  const options = matchingOptions(select, input.value);
  const renderKey = JSON.stringify({ query: input.value.trim().toLocaleLowerCase(), selected: select.value, options: options.map((option) => option.value) });
  if (panel.dataset['renderKey'] === renderKey) return;

  panel.dataset['renderKey'] = renderKey;
  panel.replaceChildren();

  if (!options.length) {
    const empty = document.createElement('div');
    empty.className = 'catalog-empty-option';
    empty.textContent = 'No se encontraron opciones.';
    panel.appendChild(empty);
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
    button.appendChild(highlightedText(option.value, input.value));

    if (select.value === option.value) {
      const check = document.createElement('span');
      check.className = 'catalog-option-check';
      check.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"></path></svg>';
      button.appendChild(check);
    }

    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => selectOption(select, input, wrapper, option.value));
    panel.appendChild(button);
  });

  const selectedIndex = options.findIndex((option) => option.value === select.value);
  setActiveOption(wrapper, selectedIndex >= 0 ? selectedIndex : 0);
}

function selectOption(select: HTMLSelectElement, input: HTMLInputElement, wrapper: HTMLElement, value: string): void {
  input.value = value;
  input.classList.remove('catalog-value-invalid');
  if (select.value !== value) {
    select.value = value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  renderOptions(select, input, wrapper);
  setPanelOpen(wrapper, false);
  input.focus();
}

function initializeCatalogAutocompletes(): void {
  ensureAutocompleteStyles();

  document.querySelectorAll<HTMLSelectElement>('app-repair-form select[formcontrolname]').forEach((select) => {
    const controlName = select.getAttribute('formcontrolname') ?? '';
    const placeholder = SEARCHABLE_CATALOG_FIELDS[controlName];
    if (!placeholder) return;

    const existingId = select.dataset['searchableInputId'];
    const existingInput = existingId ? document.getElementById(existingId) as HTMLInputElement | null : null;
    const existingWrapper = existingInput?.closest<HTMLElement>('.catalog-autocomplete') ?? null;

    if (existingInput && existingWrapper) {
      existingInput.disabled = select.disabled;
      if (document.activeElement !== existingInput && existingInput.value !== select.value) existingInput.value = select.value;
      if (existingWrapper.classList.contains('open')) renderOptions(select, existingInput, existingWrapper);
      return;
    }

    const id = `repair-${controlName}-catalog-search`;
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    const toggle = document.createElement('button');
    const searchIcon = document.createElement('span');
    const panel = document.createElement('div');
    const label = select.closest<HTMLLabelElement>('label');

    wrapper.className = 'catalog-autocomplete';
    wrapper.dataset['activeIndex'] = '-1';
    input.id = id;
    input.type = 'text';
    input.className = 'catalog-search-input';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', `${id}-options`);
    input.setAttribute('aria-expanded', 'false');
    toggle.type = 'button';
    toggle.className = 'catalog-toggle';
    toggle.setAttribute('aria-label', 'Mostrar opciones');
    toggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"></path></svg>';
    searchIcon.className = 'catalog-search-icon';
    searchIcon.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="m15 15 4.5 4.5"></path></svg>';
    panel.id = `${id}-options`;
    panel.className = 'catalog-options-panel';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;

    select.classList.add('catalog-native-select');
    select.dataset['searchableInputId'] = id;
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    label?.setAttribute('for', id);
    wrapper.append(input, toggle, searchIcon, panel);
    select.before(wrapper);

    const open = (): void => { renderOptions(select, input, wrapper); setPanelOpen(wrapper, true); };

    input.addEventListener('focus', () => { input.classList.remove('catalog-value-invalid'); open(); });
    input.addEventListener('input', () => {
      const match = exactOption(select, input.value);
      const nextValue = match?.value ?? '';
      if (select.value !== nextValue) {
        select.value = nextValue;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      input.classList.remove('catalog-value-invalid');
      renderOptions(select, input, wrapper);
      setPanelOpen(wrapper, true);
    });
    input.addEventListener('keydown', (event) => {
      const isOpen = wrapper.classList.contains('open');
      const current = Number(wrapper.dataset['activeIndex'] ?? -1);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) open();
        setActiveOption(wrapper, event.key === 'ArrowDown' ? current + 1 : Math.max(0, current - 1));
      } else if (event.key === 'Enter' && isOpen) {
        const active = wrapper.querySelector<HTMLButtonElement>('.catalog-option.keyboard-active');
        if (active) { event.preventDefault(); active.click(); }
      } else if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setPanelOpen(wrapper, false);
      }
    });
    input.addEventListener('blur', () => window.setTimeout(() => {
      const match = exactOption(select, input.value);
      if (match) {
        input.value = match.value;
        input.classList.remove('catalog-value-invalid');
      } else if (input.value.trim()) {
        input.classList.add('catalog-value-invalid');
      }
      setPanelOpen(wrapper, false);
    }, 80));
    toggle.addEventListener('mousedown', (event) => event.preventDefault());
    toggle.addEventListener('click', () => wrapper.classList.contains('open') ? setPanelOpen(wrapper, false) : (input.focus(), open()));

    input.value = select.value;
    input.disabled = select.disabled;
  });
}

function closeOpenAutocompletes(target: Node | null): void {
  document.querySelectorAll<HTMLElement>('app-repair-form .catalog-autocomplete.open').forEach((wrapper) => {
    if (!target || !wrapper.contains(target)) setPanelOpen(wrapper, false);
  });
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    document.addEventListener('click', (event) => {
      const target = event.target as Node | null;
      const settingsMenu = document.querySelector<HTMLDetailsElement>('.settings-menu[open]');
      if (settingsMenu && target && !settingsMenu.contains(target)) settingsMenu.open = false;
      closeOpenAutocompletes(target);
    });

    let scheduled = false;
    const scheduleUiUpdate = (): void => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        updateCatalogResultsCounter();
        setDefaultRepairDate();
        initializeCatalogAutocompletes();
      });
    };

    document.addEventListener('input', (event) => {
      const target = event.target as Element | null;
      if (target?.matches('.catalog-page .search-field input')) scheduleUiUpdate();
    });

    const observer = new MutationObserver((mutations) => {
      const onlyAutocompletePanelChanges = mutations.every((mutation) => (mutation.target as Element).closest?.('.catalog-options-panel'));
      if (!onlyAutocompletePanelChanges) scheduleUiUpdate();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    scheduleUiUpdate();
  })
  .catch((error) => console.error(error));

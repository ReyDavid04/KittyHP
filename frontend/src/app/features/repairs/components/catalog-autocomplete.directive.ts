import { AfterViewInit, Directive, DoCheck, ElementRef, Input, OnDestroy } from '@angular/core';

@Directive({
  selector: 'select[appCatalogAutocomplete]',
  standalone: true,
})
export class CatalogAutocompleteDirective implements AfterViewInit, DoCheck, OnDestroy {
  @Input({ required: true }) catalogAutocompletePlaceholder = '';

  private readonly abortController = new AbortController();
  private readonly select: HTMLSelectElement;
  private wrapper?: HTMLDivElement;
  private input?: HTMLInputElement;
  private panel?: HTMLDivElement;

  constructor(elementRef: ElementRef<HTMLSelectElement>) {
    this.select = elementRef.nativeElement;
  }

  ngAfterViewInit(): void {
    this.createAutocomplete();
  }

  ngDoCheck(): void {
    if (!this.input || !this.wrapper) return;

    this.input.disabled = this.select.disabled;
    if (document.activeElement !== this.input && this.input.value !== this.select.value) {
      this.input.value = this.select.value;
    }
    if (this.wrapper.classList.contains('open')) this.renderOptions();
  }

  ngOnDestroy(): void {
    this.abortController.abort();
  }

  private createAutocomplete(): void {
    const controlName = this.select.getAttribute('formcontrolname') ?? 'catalog';
    const id = `repair-${controlName}-catalog-search`;
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    const toggle = document.createElement('button');
    const searchIcon = document.createElement('span');
    const panel = document.createElement('div');

    wrapper.className = 'catalog-autocomplete';
    wrapper.dataset['activeIndex'] = '-1';

    input.id = id;
    input.type = 'text';
    input.className = 'catalog-search-input ui-control';
    input.placeholder = this.catalogAutocompletePlaceholder;
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

    this.wrapper = wrapper;
    this.input = input;
    this.panel = panel;

    this.select.classList.add('catalog-native-select');
    this.select.setAttribute('aria-hidden', 'true');
    this.select.tabIndex = -1;
    this.select.closest<HTMLLabelElement>('label')?.setAttribute('for', id);
    wrapper.append(input, toggle, searchIcon, panel);
    this.select.before(wrapper);

    const signal = this.abortController.signal;
    input.addEventListener('focus', () => {
      input.classList.remove('invalid');
      this.open();
    }, { signal });
    input.addEventListener('input', () => this.handleInput(), { signal });
    input.addEventListener('keydown', (event) => this.handleKeydown(event), { signal });
    input.addEventListener('blur', () => window.setTimeout(() => this.handleBlur(), 80), { signal });
    toggle.addEventListener('mousedown', (event) => event.preventDefault(), { signal });
    toggle.addEventListener('click', () => wrapper.classList.contains('open') ? this.close() : (input.focus(), this.open()), { signal });
    document.addEventListener('click', (event) => {
      if (!wrapper.contains(event.target as Node | null)) this.close();
    }, { signal });

    input.value = this.select.value;
    input.disabled = this.select.disabled;
  }

  private availableOptions(): HTMLOptionElement[] {
    return Array.from(this.select.options).filter((option) => Boolean(option.value));
  }

  private exactOption(value: string): HTMLOptionElement | undefined {
    const normalized = value.trim().toLocaleLowerCase();
    return normalized
      ? this.availableOptions().find((option) => option.value.trim().toLocaleLowerCase() === normalized)
      : undefined;
  }

  private matchingOptions(value: string): HTMLOptionElement[] {
    const normalized = value.trim().toLocaleLowerCase();
    return normalized
      ? this.availableOptions().filter((option) => option.value.toLocaleLowerCase().includes(normalized))
      : this.availableOptions();
  }

  private open(): void {
    this.renderOptions();
    this.setOpen(true);
  }

  private close(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    if (!this.wrapper || !this.input || !this.panel) return;

    this.wrapper.classList.toggle('open', open);
    this.panel.hidden = !open;
    this.input.setAttribute('aria-expanded', String(open));
    if (!open) this.wrapper.dataset['activeIndex'] = '-1';
  }

  private handleInput(): void {
    if (!this.input) return;

    const nextValue = this.exactOption(this.input.value)?.value ?? '';
    if (this.select.value !== nextValue) {
      this.select.value = nextValue;
      this.emitSelectChange();
    }
    this.input.classList.remove('invalid');
    this.renderOptions();
    this.setOpen(true);
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.wrapper) return;

    const isOpen = this.wrapper.classList.contains('open');
    const current = Number(this.wrapper.dataset['activeIndex'] ?? -1);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) this.open();
      this.setActiveOption(event.key === 'ArrowDown' ? current + 1 : Math.max(0, current - 1));
      return;
    }

    if (event.key === 'Enter' && isOpen) {
      const active = this.wrapper.querySelector<HTMLButtonElement>('.catalog-option.keyboard-active');
      if (active) {
        event.preventDefault();
        active.click();
      }
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      this.close();
    }
  }

  private handleBlur(): void {
    if (!this.input) return;

    const match = this.exactOption(this.input.value);
    if (match) {
      this.input.value = match.value;
      this.input.classList.remove('invalid');
    } else if (this.input.value.trim()) {
      this.input.classList.add('invalid');
    }
    this.close();
  }

  private renderOptions(): void {
    if (!this.wrapper || !this.input || !this.panel) return;

    const options = this.matchingOptions(this.input.value);
    const renderKey = JSON.stringify({
      query: this.input.value.trim().toLocaleLowerCase(),
      selected: this.select.value,
      options: options.map((option) => option.value),
    });
    if (this.panel.dataset['renderKey'] === renderKey) return;

    this.panel.dataset['renderKey'] = renderKey;
    this.panel.replaceChildren();

    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 'catalog-empty-option';
      empty.textContent = 'No se encontraron opciones.';
      this.panel.appendChild(empty);
      this.wrapper.dataset['activeIndex'] = '-1';
      return;
    }

    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'catalog-option';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(this.select.value === option.value));
      button.classList.toggle('selected', this.select.value === option.value);
      button.appendChild(this.highlightedText(option.value, this.input?.value ?? ''));

      if (this.select.value === option.value) {
        const check = document.createElement('span');
        check.className = 'catalog-option-check';
        check.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"></path></svg>';
        button.appendChild(check);
      }

      button.addEventListener('mousedown', (event) => event.preventDefault(), { signal: this.abortController.signal });
      button.addEventListener('click', () => this.selectOption(option.value), { signal: this.abortController.signal });
      this.panel?.appendChild(button);
    });

    const selectedIndex = options.findIndex((option) => option.value === this.select.value);
    this.setActiveOption(selectedIndex >= 0 ? selectedIndex : 0);
  }

  private highlightedText(value: string, query: string): HTMLElement {
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

  private setActiveOption(requestedIndex: number): void {
    if (!this.wrapper) return;

    const options = Array.from(this.wrapper.querySelectorAll<HTMLButtonElement>('.catalog-option'));
    if (!options.length) {
      this.wrapper.dataset['activeIndex'] = '-1';
      return;
    }

    const index = Math.max(0, Math.min(requestedIndex, options.length - 1));
    this.wrapper.dataset['activeIndex'] = String(index);
    options.forEach((option, optionIndex) => option.classList.toggle('keyboard-active', optionIndex === index));
    options[index].scrollIntoView({ block: 'nearest' });
  }

  private selectOption(value: string): void {
    if (!this.input) return;

    this.input.value = value;
    this.input.classList.remove('invalid');
    if (this.select.value !== value) {
      this.select.value = value;
      this.emitSelectChange();
    }
    this.renderOptions();
    this.close();
    this.input.focus();
  }

  private emitSelectChange(): void {
    this.select.dispatchEvent(new Event('input', { bubbles: true }));
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

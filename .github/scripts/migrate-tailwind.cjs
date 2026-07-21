const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');

const repositoryRoot = path.resolve(__dirname, '../..');
const frontendRoot = path.join(repositoryRoot, 'frontend');
const sourceRoot = path.join(frontendRoot, 'src');
const appRoot = path.join(sourceRoot, 'app');

const cssSources = [];
const cssFilesToDelete = new Set();

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function normalizeSelector(selector, hostSelector) {
  return selector
    .replace(/:host-context\(([^)]+)\)/g, '$1')
    .replace(/:host\b/g, hostSelector)
    .replace(/::ng-deep\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function rootClassFromTemplate(template) {
  const match = template.match(/<[a-zA-Z][^>]*\bclass="([^"]+)"/);
  const firstClass = match?.[1]?.split(/\s+/).find((value) => value && !value.includes('{{'));
  return firstClass ? `.${firstClass}` : 'body';
}

function hostSelectorForFile(filePath, source) {
  const explicitSelector = source.match(/selector\s*:\s*['"]([^'"]+)['"]/i)?.[1];
  if (explicitSelector) return explicitSelector;

  const inlineTemplate = source.match(/template\s*:\s*`([\s\S]*?)`/m)?.[1];
  if (inlineTemplate) return rootClassFromTemplate(inlineTemplate);

  const templateUrl = source.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/i)?.[1];
  if (templateUrl) {
    const templatePath = path.resolve(path.dirname(filePath), templateUrl);
    if (fs.existsSync(templatePath)) return rootClassFromTemplate(fs.readFileSync(templatePath, 'utf8'));
  }

  return 'body';
}

function addCssSource(css, from, hostSelector) {
  if (!css.trim()) return;
  cssSources.push({ css, from, hostSelector });
}

function extractComponentStyles(filePath, source) {
  const hostSelector = hostSelectorForFile(filePath, source);
  let output = source;

  output = output.replace(/\n\s*styles\s*:\s*\[\s*`([\s\S]*?)`\s*,?\s*\]\s*,?/gm, (_match, css) => {
    addCssSource(css, filePath, hostSelector);
    return '';
  });

  output = output.replace(/\n\s*styleUrls\s*:\s*\[([^\]]*)\]\s*,?/gm, (_match, values) => {
    const matches = [...values.matchAll(/['"]([^'"]+\.css)['"]/g)];
    for (const match of matches) {
      const cssPath = path.resolve(path.dirname(filePath), match[1]);
      if (!fs.existsSync(cssPath)) continue;
      addCssSource(fs.readFileSync(cssPath, 'utf8'), cssPath, hostSelector);
      cssFilesToDelete.add(cssPath);
    }
    return '';
  });

  output = output.replace(/\n\s*styleUrl\s*:\s*['"]([^'"]+\.css)['"]\s*,?/gm, (_match, relativePath) => {
    const cssPath = path.resolve(path.dirname(filePath), relativePath);
    if (fs.existsSync(cssPath)) {
      addCssSource(fs.readFileSync(cssPath, 'utf8'), cssPath, hostSelector);
      cssFilesToDelete.add(cssPath);
    }
    return '';
  });

  return output;
}

function arbitraryClass(property, rawValue) {
  const important = /!important\s*$/.test(rawValue);
  const value = rawValue
    .replace(/!important\s*$/, '')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/\s+/g, '_');
  if (!property || !value) return '';
  return `${important ? '!' : ''}[${property}:${value}]`;
}

function styleToUtilities(style) {
  return style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 1) return '';
      return arbitraryClass(declaration.slice(0, separator).trim(), declaration.slice(separator + 1).trim());
    })
    .filter(Boolean)
    .join(' ');
}

function convertStaticInlineStyles(source) {
  return source.replace(/<[^>]*\sstyle="[^"]*"[^>]*>/g, (tag) => {
    const styleMatch = tag.match(/\sstyle="([^"]*)"/);
    if (!styleMatch) return tag;
    const utilities = styleToUtilities(styleMatch[1]);
    let converted = tag.replace(styleMatch[0], '');
    if (!utilities) return converted;

    const classMatch = converted.match(/\sclass="([^"]*)"/);
    if (classMatch) {
      return converted.replace(classMatch[0], ` class="${classMatch[1]} ${utilities}"`);
    }

    return converted.replace(/\s*\/?>(\s*)$/, (ending) => ` class="${utilities}"${ending}`);
  });
}

const structuralProperties = new Set([
  'display', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index',
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'overflow', 'overflow-x', 'overflow-y', 'overflow-wrap',
  'box-sizing', 'object-fit', 'object-position', 'aspect-ratio',
  'order', 'gap', 'row-gap', 'column-gap', 'white-space', 'text-overflow', 'text-align',
  'vertical-align', 'table-layout', 'border-collapse', 'border-spacing', 'list-style',
  'transform', 'transform-origin', 'pointer-events', 'visibility', 'resize', 'isolation',
  'content', 'opacity', 'appearance', 'clip', 'clip-path', 'filter',
  'background-image', 'background-position', 'background-repeat', 'background-size',
  'animation', 'animation-name', 'animation-duration', 'animation-iteration-count',
  'animation-timing-function', 'animation-fill-mode', 'animation-delay',
  'font-variant-numeric',
]);

const structuralPrefixes = [
  'grid-', 'flex-', 'align-', 'justify-', 'place-', 'scroll-', 'columns',
];

function isInsideKeyframes(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'atrule' && /keyframes$/i.test(current.name)) return true;
    current = current.parent;
  }
  return false;
}

function keepStructuralDeclaration(property, declaration) {
  if (isInsideKeyframes(declaration)) return true;
  return structuralProperties.has(property) || structuralPrefixes.some((prefix) => property.startsWith(prefix));
}

function removeEmptyNodes(container) {
  if (!container.nodes) return;
  for (const node of [...container.nodes]) {
    if (node.nodes) removeEmptyNodes(node);
    if ((node.type === 'rule' || node.type === 'atrule') && (!node.nodes || node.nodes.length === 0)) node.remove();
  }
}

function structuralCss() {
  const output = postcss.root();

  for (const source of cssSources) {
    let root;
    try {
      root = postcss.parse(source.css, { from: source.from });
    } catch (error) {
      console.warn(`No se pudo analizar ${source.from}:`, error.message);
      continue;
    }

    root.walkRules((rule) => {
      rule.selector = normalizeSelector(rule.selector, source.hostSelector);
    });

    root.walkDecls((declaration) => {
      const property = declaration.prop.toLowerCase();
      if (!keepStructuralDeclaration(property, declaration)) declaration.remove();
    });

    removeEmptyNodes(root);
    output.append(root.nodes);
  }

  return output.toString();
}

function updateAngularJson() {
  const angularPath = path.join(frontendRoot, 'angular.json');
  const angularJson = JSON.parse(fs.readFileSync(angularPath, 'utf8'));
  const project = angularJson.projects['kittyhp-frontend'];
  project.architect.build.options.styles = ['src/styles.css'];
  fs.writeFileSync(angularPath, `${JSON.stringify(angularJson, null, 2)}\n`);
}

const legacyGlobalFiles = [
  path.join(sourceRoot, 'styles.css'),
  path.join(sourceRoot, 'catalog-management-overrides.css'),
  path.join(sourceRoot, 'login-typography-overrides.css'),
];

for (const cssPath of legacyGlobalFiles) {
  if (fs.existsSync(cssPath)) addCssSource(fs.readFileSync(cssPath, 'utf8'), cssPath, 'body');
}

const applicationFiles = walk(appRoot);
for (const filePath of applicationFiles.filter((file) => file.endsWith('.ts'))) {
  const source = fs.readFileSync(filePath, 'utf8');
  const withoutStyles = extractComponentStyles(filePath, source);
  fs.writeFileSync(filePath, convertStaticInlineStyles(withoutStyles));
}

for (const filePath of applicationFiles.filter((file) => file.endsWith('.html'))) {
  fs.writeFileSync(filePath, convertStaticInlineStyles(fs.readFileSync(filePath, 'utf8')));
}

for (const cssPath of walk(appRoot).filter((file) => file.endsWith('.css'))) {
  if (!cssFilesToDelete.has(cssPath)) {
    addCssSource(fs.readFileSync(cssPath, 'utf8'), cssPath, 'body');
    cssFilesToDelete.add(cssPath);
  }
}

const designSystem = String.raw`
@import "tailwindcss";

@theme {
  --font-sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --color-brand-50: #f4f7fb;
  --color-brand-100: #e8eff8;
  --color-brand-200: #ccdced;
  --color-brand-300: #a8c2df;
  --color-brand-400: #749dc8;
  --color-brand-500: #4779ae;
  --color-brand-600: #315f93;
  --color-brand-700: #284d79;
  --color-brand-800: #243f62;
  --color-brand-900: #203652;
  --color-success-50: #f1f8f5;
  --color-success-100: #dcefe7;
  --color-success-600: #28745b;
  --color-success-700: #205d49;
  --color-danger-50: #fff5f6;
  --color-danger-100: #fde8eb;
  --color-danger-600: #b13b50;
  --color-danger-700: #922f42;
  --color-warning-50: #fff9eb;
  --color-warning-100: #fcefc8;
  --color-warning-700: #7d5a12;
}

@layer base {
  :root {
    color-scheme: light;
    font-family: var(--font-sans);
    --bg: #f5f7fa;
    --surface: #ffffff;
    --surface-subtle: #f8fafc;
    --surface-muted: #eef2f6;
    --text: #1f2937;
    --muted: #6b7789;
    --primary: #315f93;
    --primary-strong: #284d79;
    --primary-soft: #e8eff8;
    --accent: #4779ae;
    --success: #28745b;
    --success-soft: #edf7f2;
    --warning: #7d5a12;
    --warning-soft: #fff9eb;
    --danger: #b13b50;
    --danger-soft: #fff5f6;
    --border: #dbe2ea;
    --border-strong: #c9d3df;
  }

  * { @apply box-border; }
  html { @apply min-h-full bg-slate-100; }
  body { @apply m-0 min-h-full bg-slate-50 font-sans text-slate-800 antialiased; }
  button, input, select, textarea { @apply font-sans; }
  button { @apply select-none; -webkit-tap-highlight-color: transparent; }
  a { @apply text-inherit; }
  :where(button, a, input, select, textarea, summary):focus-visible {
    @apply outline-none ring-2 ring-brand-200 ring-offset-1 ring-offset-white;
  }
  ::selection { @apply bg-brand-100 text-slate-900; }
}

@layer components {
  app-root, .app-shell { @apply block min-h-dvh; }
  .app-content { @apply m-0 w-full max-w-none p-0; }

  .app-header {
    @apply border-b border-slate-200/90 bg-white/95 px-[18px] text-slate-700 shadow-[0_1px_0_rgba(15,23,42,.03)] backdrop-blur-xl;
  }
  .brand { @apply inline-flex w-max items-center gap-2 no-underline; }
  .brand-icon { @apply size-[30px] shrink-0; }
  .brand strong { @apply text-sm font-semibold tracking-tight text-slate-800; }
  .main-nav { @apply items-stretch gap-5; }
  .main-nav > a, .settings-menu summary {
    @apply relative inline-flex items-center px-1 text-[0.78rem] font-medium text-slate-500 no-underline transition-colors duration-150;
  }
  .main-nav > a::after, .settings-menu summary::after {
    position: absolute; right: 0; bottom: 0; left: 0; height: 2px; border-radius: 2px 2px 0 0;
    background: var(--primary); content: ''; opacity: 0; transform: scaleX(.55); transition: 160ms ease;
  }
  .main-nav > a:hover, .main-nav > a.active, .settings-menu[open] summary, .settings-menu.active summary {
    @apply text-brand-700;
  }
  .main-nav > a.active::after, .settings-menu.active summary::after { opacity: 1; transform: scaleX(1); }
  .settings-menu summary { @apply gap-2; list-style: none; }
  .settings-menu summary::-webkit-details-marker { display: none; }
  .settings-menu summary > svg:first-child, .menu-icon, .user-chip svg, .logout-button svg {
    @apply size-4 shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6];
  }
  .settings-menu .chevron { @apply size-3.5 fill-none stroke-current transition-transform duration-150 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]; }
  .settings-menu[open] .chevron { @apply rotate-180; }
  .settings-dropdown {
    @apply border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,.12)];
    border-radius: 10px;
  }
  .dropdown-title { @apply px-2.5 pb-2 pt-1 text-[0.61rem] font-semibold uppercase tracking-[0.09em] text-slate-400; }
  .settings-dropdown a {
    @apply relative my-0.5 flex min-h-9 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-slate-700 no-underline transition-colors duration-150;
  }
  .settings-dropdown a:hover { @apply border-brand-100 bg-brand-50 text-brand-700; }
  .settings-dropdown a.active { @apply border-brand-100 bg-brand-100/70 pl-[18px] text-brand-700; }
  .settings-dropdown a.active::before {
    position: absolute; top: 9px; bottom: 9px; left: 7px; width: 3px; border-radius: 999px; background: var(--primary); content: '';
  }
  .settings-dropdown strong { @apply text-[0.73rem] font-medium leading-tight; }
  .menu-divider { @apply mx-1 my-1.5 h-px bg-slate-100; }
  .user-chip { @apply inline-flex min-h-[30px] max-w-60 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-medium text-slate-600; }
  .user-chip > span { @apply truncate; }
  .logout-button { @apply inline-flex min-h-[30px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[0.68rem] font-medium text-slate-500 transition-colors duration-150; }
  .logout-button:hover { @apply border-danger-100 bg-danger-50 text-danger-700; }

  .page-heading, .panel-heading, .page-header {
    @apply border-b border-slate-200 bg-white px-[22px] py-[9px];
  }
  .page-heading h1, .panel-heading h2, .page-header h1, .heading-copy h1 {
    @apply m-0 text-[clamp(1.12rem,1.6vw,1.35rem)] font-semibold leading-tight tracking-[-0.025em] text-slate-800;
  }
  .page-heading > div > span, .panel-heading p, .title-block p, .heading-copy > span {
    @apply text-[0.7rem] font-normal text-slate-500;
  }
  .users-content, .report-content { @apply gap-4 px-[22px] pb-7 pt-5; }

  .primary-button, .create-button, .save-button, .header-save-button, .login-button, .apply-filter, .create-row > button {
    @apply inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-600 px-3.5 py-2 text-[0.73rem] font-medium text-white shadow-[0_4px_12px_rgba(49,95,147,.14)] transition-colors duration-150;
  }
  .primary-button:hover:not(:disabled), .create-button:hover:not(:disabled), .save-button:hover:not(:disabled), .header-save-button:hover:not(:disabled), .login-button:hover:not(:disabled), .apply-filter:hover:not(:disabled), .create-row > button:hover:not(:disabled) {
    @apply border-brand-700 bg-brand-700;
  }
  .secondary-button, .back-button, .cancel-button, .cancel-filter {
    @apply inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[0.72rem] font-normal text-slate-600 transition-colors duration-150;
  }
  .secondary-button:hover:not(:disabled), .back-button:hover:not(:disabled), .cancel-button:hover:not(:disabled), .cancel-filter:hover:not(:disabled) {
    @apply border-slate-300 bg-slate-50 text-brand-700;
  }
  .text-button { @apply inline-flex min-h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[0.69rem] font-medium text-slate-600 transition-colors duration-150; }
  .text-button:hover:not(:disabled) { @apply border-slate-300 bg-slate-50 text-brand-700; }
  .text-button.primary { @apply border-brand-600 bg-brand-600 text-white; }
  .text-button.danger { @apply text-danger-700; }
  .icon-button, .filter-button, .close-form, .close-filter, .clear-search, .password-toggle {
    @apply grid place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors duration-150;
  }
  .icon-button:hover:not(:disabled), .filter-button:hover:not(:disabled), .close-form:hover:not(:disabled), .close-filter:hover:not(:disabled), .clear-search:hover:not(:disabled), .password-toggle:hover:not(:disabled) {
    @apply border-slate-300 bg-slate-50 text-brand-700;
  }
  .icon-button.edit, .icon-button.view { @apply text-brand-700; }
  .icon-button.delete { @apply text-danger-700; }
  .icon-button.delete:hover:not(:disabled) { @apply border-danger-100 bg-danger-50; }
  :where(button, input, select):disabled { @apply cursor-not-allowed opacity-50 shadow-none; }
  .button-icon { @apply grid size-4 place-items-center rounded bg-white/15 text-sm font-normal; }

  :where(input:not([type='checkbox']):not([type='radio']):not([type='file']), select, textarea) {
    @apply w-full rounded-lg border border-slate-200 bg-white text-[0.78rem] font-normal text-slate-700 placeholder:text-slate-400 transition-colors duration-150;
  }
  :where(input:not([type='checkbox']):not([type='radio']):not([type='file']), select) { @apply h-10 px-3; }
  textarea { @apply px-3 py-2.5 leading-relaxed; }
  :where(input, select, textarea):hover:not(:disabled) { @apply border-slate-300; }
  :where(input, select, textarea):focus { @apply border-brand-400 bg-white outline-none ring-2 ring-brand-100; }
  :where(input, select, textarea).invalid, .email-input.invalid, .input-shell.invalid, .upload-zone.invalid {
    @apply border-danger-600 bg-danger-50 ring-2 ring-danger-100;
  }
  input[readonly] { @apply cursor-default bg-slate-50 text-brand-700; }
  label, .field { @apply text-[0.7rem] font-medium text-slate-600; }
  label > span:first-child, .field > span:first-child { @apply text-slate-600; }
  .field b, .upload-content b { @apply font-medium text-danger-600; }

  .message, .form-message, .page-message, .login-message, .error-message, .loading-state, .sent-to {
    @apply rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[0.71rem] font-normal text-slate-600;
  }
  .message.success, .login-message.success { @apply border-success-100 bg-success-50 text-success-700; }
  .message.error, .login-message.error, .form-message.error, .page-message.error, .error-message { @apply border-danger-100 bg-danger-50 text-danger-700; }
  .login-message.development { @apply border-warning-100 bg-warning-50 text-warning-700; }

  .user-form, .detail-card, .text-card, .image-card, .view-mode-toolbar, .comparison-selection, .week-detail-heading {
    @apply rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)];
  }
  .user-form { @apply bg-slate-50/60 p-[18px]; }
  .form-heading strong { @apply text-sm font-semibold text-slate-800; }
  .form-heading span { @apply text-[0.69rem] font-normal text-slate-500; }
  .email-input, .input-shell, .search-box, .search-field, .filter-search {
    @apply border-slate-200 bg-white;
  }
  .email-input:focus-within, .input-shell:focus-within, .search-box:focus-within, .filter-search:focus-within {
    @apply border-brand-400 ring-2 ring-brand-100;
  }
  .email-input input, .input-shell input, .search-box input, .search-field input, .filter-search input {
    @apply border-0 bg-transparent shadow-none ring-0;
  }
  .email-suffix, .email-input > span { @apply text-[0.72rem] font-normal text-slate-500; }
  .status-toggle { @apply rounded-lg border border-slate-200 bg-white text-[0.72rem] font-medium text-slate-500; }
  .status-toggle.active { @apply text-success-700; }
  .toggle-track { @apply bg-slate-300; }
  .status-toggle.active .toggle-track { @apply bg-success-600; }

  .table-shell, .users-table-wrap, .table-wrap {
    @apply border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)];
  }
  table { @apply text-slate-700; }
  thead th {
    @apply border-slate-200 bg-slate-50 text-[0.65rem] font-semibold uppercase tracking-[0.05em] text-slate-500;
  }
  tbody td { @apply border-slate-100 bg-white text-[0.75rem] font-normal text-slate-700; }
  tbody tr:hover td { @apply bg-slate-50/80; }
  .record-count, .search-count, .item-count, .selection-count, .view-hint { @apply text-[0.68rem] font-medium text-slate-500; }
  .avatar { @apply rounded-lg bg-brand-100 text-[0.64rem] font-semibold text-brand-700; }
  .user-email strong { @apply text-[0.74rem] font-medium text-slate-800; }
  .user-email small { @apply text-[0.6rem] font-medium text-brand-700; }
  .role-badge, .status-badge, .status, .date-value, .rate-pill, .category-pill, .status-pill {
    @apply inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[0.65rem] font-medium text-slate-600;
  }
  .role-badge.admin, .rate-pill { @apply bg-brand-100 text-brand-700; }
  .status-badge, .status, .status-pill { @apply bg-success-50 text-success-700; }
  .status-badge.inactive, .status.inactive, .status-pill.empty { @apply bg-slate-100 text-slate-500; }

  .login-page { @apply flex min-h-dvh w-full items-center justify-center bg-white p-8; }
  .login-panel { @apply relative flex w-full max-w-[440px] flex-col bg-transparent p-0 shadow-none; }
  .login-visual { @apply hidden; }
  .login-brand { @apply static mb-10 flex w-full items-center justify-start gap-2.5; }
  .login-brand img { @apply size-9; }
  .login-brand strong { @apply text-sm font-semibold text-slate-800; }
  .login-brand span, .login-heading > span { @apply hidden; }
  .login-heading { @apply mb-6 items-start gap-1.5 text-left; }
  .login-heading h1 { @apply text-[clamp(1.7rem,5vw,2rem)] font-semibold tracking-[-0.035em] text-slate-800; }
  .login-heading p { @apply m-0 max-w-[390px] text-[0.74rem] font-normal leading-relaxed text-slate-500; }
  .login-page form { @apply w-full gap-[15px]; }
  .login-page label { @apply gap-2 text-[0.68rem] font-medium text-slate-600; }
  .label-row a, .access-footer a, .text-button { @apply text-brand-700 no-underline; }
  .input-shell { @apply h-12 gap-2.5 rounded-lg border px-3; }
  .input-shell > svg, .password-toggle svg, .login-message svg, .login-button svg {
    @apply size-[18px] shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7];
  }
  .password-toggle { @apply size-[30px] border-0 bg-transparent; }
  .login-button { @apply mt-0.5 min-h-[46px] w-full; }
  .access-footer { @apply text-center text-[0.68rem] font-normal text-slate-400; }

  .catalog-page, .catalog-panel, .users-page, .view-page, .editor-page, .production-page { @apply min-h-[calc(100dvh-50px)] bg-white; }
  .catalog-panel, .editor-workspace, .workspace { @apply border-0 bg-white shadow-none; }
  .create-row, .search-row, .workspace-header { @apply border-slate-200 bg-white; }
  .create-row label { @apply text-[0.69rem] font-medium; }
  .catalog-results-count { @apply text-[0.68rem] font-medium text-slate-500; }
  .no-results, .empty-state { @apply text-center text-[0.76rem] font-normal text-slate-500; }
  .no-results strong, .empty-state h3, .empty-state strong { @apply font-medium text-slate-800; }

  .workspace-header { @apply border-y px-[18px] py-2.5; }
  .search-field input { @apply h-9 rounded-lg bg-slate-50 px-9 text-[0.76rem]; }
  .search-icon, .search-field > svg { @apply text-slate-400; }
  .pagination { @apply border-t border-slate-200 bg-slate-50 px-[18px] py-3 text-slate-500; }
  .page-size, .page-info, .total-records { @apply text-[0.72rem] font-normal; }
  .pager button { @apply grid size-8 place-items-center rounded-lg border border-slate-200 bg-white px-2 text-[0.7rem] font-normal text-slate-500 transition-colors; }
  .pager button:hover:not(:disabled) { @apply border-slate-300 text-brand-700; }
  .pager button.active { @apply border-brand-600 bg-brand-600 text-white; }

  .filter-button.active { @apply border-brand-600 bg-brand-600 text-white; }
  .sort-indicator { @apply text-brand-700; }
  .sticky-left, .sticky-right { @apply bg-white; }
  th.sticky-left, th.sticky-right { @apply bg-slate-50; }
  .thumbnail { @apply rounded-lg border border-slate-200 bg-slate-100 object-cover; }
  .image-link { @apply overflow-hidden rounded-lg text-brand-700 no-underline; }
  .empty-value { @apply text-[0.7rem] text-slate-400; }
  .filter-backdrop { @apply bg-slate-900/10 backdrop-blur-[1px]; }
  .filter-popover { @apply rounded-lg border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,.16)]; }
  .filter-header { @apply border-b border-slate-200 bg-slate-50 px-4 py-3; }
  .filter-header span { @apply text-[0.61rem] font-semibold uppercase tracking-wide text-slate-400; }
  .filter-header strong { @apply text-sm font-semibold text-slate-800; }
  .sort-menu { @apply border-b border-slate-200 p-2; }
  .sort-menu button { @apply rounded-md text-[0.72rem] font-normal text-slate-600; }
  .sort-menu button:hover, .sort-menu button.active { @apply bg-brand-50 text-brand-700; }
  .clear-column-filter { @apply border-b border-slate-200 bg-white text-[0.7rem] font-medium text-brand-700; }
  .select-all-row, .filter-footer { @apply border-slate-200 bg-slate-50; }
  .filter-options label { @apply rounded-md text-[0.71rem] font-normal text-slate-600; }
  .filter-options label:hover, .filter-options label.selected { @apply bg-brand-50 text-brand-700; }
  input[type='checkbox'] { @apply size-4 rounded border-slate-300 accent-brand-600; }

  .form-body { @apply px-9 pb-10 pt-8; }
  .field { @apply gap-2 text-[0.72rem] font-medium; }
  .field input, .field select { @apply h-11 px-3.5 text-[0.78rem]; }
  .field textarea { @apply min-h-36 text-[0.78rem]; }
  .suffix-input > span { @apply text-brand-700; }
  .upload-zone { @apply rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-700 transition-colors; }
  .upload-zone:hover { @apply border-brand-400 bg-brand-50/50; }
  .upload-zone.has-file { @apply border-solid border-brand-200 bg-white; }
  .upload-icon { @apply rounded-lg bg-brand-100 text-brand-700; }
  .upload-icon svg { @apply size-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]; }
  .image-preview { @apply overflow-hidden rounded-lg border border-slate-200 bg-slate-100; }
  .image-change { @apply bg-slate-900/70 text-[0.67rem] font-medium text-white; }
  .upload-content { @apply text-[0.71rem] font-normal text-slate-500; }
  .upload-content strong { @apply text-[0.8rem] font-medium text-slate-800; }
  .form-actions { @apply border-t border-slate-200 bg-white/95 px-9 py-4 backdrop-blur-xl; }

  .detail-card, .text-card, .image-card { @apply p-4; }
  .detail-card:hover { @apply border-slate-300; }
  .detail-label, .section-label { @apply text-[0.64rem] font-semibold uppercase tracking-[0.055em] text-slate-500; }
  .detail-value { @apply text-[0.82rem] font-normal leading-relaxed text-slate-700; }
  .number-card .detail-value { @apply text-[0.9rem] font-medium tabular-nums text-brand-700; }
  .text-card p { @apply text-[0.78rem] font-normal leading-relaxed text-slate-700; }
  .image-card a, .no-image { @apply rounded-lg bg-slate-50; }
  .zoom-hint { @apply rounded-md bg-slate-900/75 px-2.5 py-1.5 text-[0.66rem] font-normal text-white; }
  .error-title { @apply font-medium text-danger-700; }

  .production-content { @apply px-[18px] pb-[18px] pt-2; }
  .view-mode-toolbar, .comparison-selection { @apply bg-slate-50/70; }
  .view-tabs { @apply rounded-lg border border-slate-200 bg-white p-1; }
  .view-tabs button { @apply rounded-md px-2.5 py-1.5 text-[0.66rem] font-medium text-slate-500 transition-colors; }
  .view-tabs button:hover { @apply bg-slate-50 text-brand-700; }
  .view-tabs button.active { @apply bg-brand-600 text-white; }
  .week-chip { @apply rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[0.63rem] font-medium text-brand-700; }
  .week-chip:hover:not(:disabled) { @apply border-danger-100 bg-danger-50 text-danger-700; }
  .production-table { @apply text-[0.68rem] text-slate-700; }
  .production-table th, .production-table td { @apply border-slate-200; }
  .production-table thead th { @apply bg-brand-800 text-[0.67rem] font-medium normal-case tracking-normal text-white; }
  .series-name, .metric-name { @apply bg-slate-50 text-slate-700; }
  .series-name { @apply text-[0.7rem] font-medium; }
  .metric-name { @apply font-normal; }
  .series-row.alt-series .series-name, .series-row.alt-series .metric-name, .series-row.alt-series td { @apply bg-brand-50/60; }
  .overall-row th, .overall-row td { @apply bg-amber-50; }
  .overall-name, .overall-row .metric-name { @apply bg-amber-100; }
  .week-total { @apply bg-slate-100 font-medium; }
  .overall-row .week-total { @apply bg-amber-100; }
  .calculated-cell { @apply font-medium text-slate-700; }
  .rate-cell { @apply font-medium text-brand-700; }
  .input-cell input { @apply h-[30px] rounded-none border-0 bg-transparent px-1.5 text-center text-[0.7rem] shadow-none ring-0; }
  .input-cell input:focus { @apply bg-white ring-2 ring-inset ring-brand-400; }
  .input-cell input.invalid { @apply bg-danger-50 text-danger-700 ring-2 ring-inset ring-danger-600; }
  .empty-trend { @apply rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[0.72rem] text-slate-500; }

  @media (max-width: 760px) {
    .app-header { @apply flex min-h-12 justify-between px-3; }
    .main-nav { @apply ml-auto h-12 gap-3; }
    .main-nav > a { @apply hidden; }
    .settings-menu summary { @apply h-12; }
    .settings-dropdown { right: 0; left: auto; width: min(232px, calc(100vw - 24px)); }
    .user-chip { @apply hidden; }
    .logout-button { @apply size-8 p-0; }
    .logout-button span { @apply hidden; }
  }

  @media (max-width: 720px) {
    .page-heading, .panel-heading, .page-header { @apply px-3 py-2; }
    .users-content, .report-content, .production-content { @apply px-3 pb-5 pt-3; }
    .login-page { @apply items-start p-6; }
    .login-panel { @apply pt-4; }
    .login-brand { @apply mb-12; }
    .workspace-header { @apply px-3; }
    .form-body { @apply px-[18px] pb-7 pt-5; }
    .form-actions { @apply px-[18px] py-3.5; }
    .view-mode-toolbar, .comparison-selection { @apply items-stretch; }
  }
}
`;

const structural = structuralCss();
const finalStyles = `${designSystem}\n\n@layer components {\n${structural}\n}\n`;
fs.writeFileSync(path.join(sourceRoot, 'styles.css'), finalStyles);

for (const cssPath of cssFilesToDelete) {
  if (cssPath !== path.join(sourceRoot, 'styles.css') && fs.existsSync(cssPath)) fs.rmSync(cssPath);
}
for (const cssPath of legacyGlobalFiles.slice(1)) {
  if (fs.existsSync(cssPath)) fs.rmSync(cssPath);
}

updateAngularJson();

console.log(`Migración Tailwind completada. Fuentes CSS consolidadas: ${cssSources.length}.`);

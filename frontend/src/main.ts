import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    document.addEventListener('click', (event) => {
      const openCatalogMenu = document.querySelector<HTMLDetailsElement>('.settings-menu[open]');
      const target = event.target as Node | null;

      if (openCatalogMenu && target && !openCatalogMenu.contains(target)) {
        openCatalogMenu.open = false;
      }
    });
  })
  .catch((error) => console.error(error));

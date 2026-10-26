import { bootstrapApplication } from '@angular/platform-browser';
import { AdminRoot } from './admin-root';
import { appConfig } from './app.config';

bootstrapApplication(AdminRoot, appConfig).catch((error) => console.error(error));

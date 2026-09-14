import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'pendientes',
        loadComponent: () =>
          import('./pendientes/pendientes.page').then((m) => m.PendientesPage),
      },
      {
        path: 'informes',
        loadComponent: () =>
          import('./informes/informes.page').then((m) => m.InformesPage),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./perfil/perfil.page').then((m) => m.PerfilPage),
      },
      {
        path: '',
        redirectTo: 'pendientes',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'cuenta/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./cuenta-detalle/cuenta-detalle.page').then((m) => m.CuentaDetallePage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

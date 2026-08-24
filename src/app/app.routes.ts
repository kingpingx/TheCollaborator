import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'The Collaborator',
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/projects').then((m) => m.Projects),
    title: 'Projects · The Collaborator',
  },
  {
    path: 'projects/:name',
    loadComponent: () =>
      import('./features/project-detail/project-detail').then((m) => m.ProjectDetail),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((m) => m.About),
    title: 'About · The Collaborator',
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
    title: 'Not found · The Collaborator',
  },
];

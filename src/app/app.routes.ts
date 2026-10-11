import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((module) => module.Login),
    title: "Log in | Kimi and Sia's Neighborhood",
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/neighborhood/home/home').then((module) => module.Home),
    title: "Neighborhood | Kimi and Sia's Neighborhood",
  },
  {
    path: 'garden',
    canActivate: [authGuard],
    loadComponent: () => import('./features/neighborhood/home/home').then((module) => module.Home),
    title: "My Garden | Kimi and Sia's Neighborhood",
  },
  {
    path: 'shop',
    canActivate: [authGuard],
    loadComponent: () => import('./features/neighborhood/home/home').then((module) => module.Home),
    title: "Little Shop | Kimi and Sia's Neighborhood",
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () => import('./features/neighborhood/home/home').then((module) => module.Home),
    title: "My Inventory | Kimi and Sia's Neighborhood",
  },
  {
    path: 'neighborhood',
    canActivate: [authGuard],
    loadComponent: () => import('./features/neighborhood/home/home').then((module) => module.Home),
    title: "Neighborhood | Kimi and Sia's Neighborhood",
  },
  {
    path: 'invitations',
    canActivate: [authGuard],
    loadComponent: () => import('./features/neighborhood/home/home').then((module) => module.Home),
    title: "Invitations | Kimi and Sia's Neighborhood",
  },
  { path: '', pathMatch: 'full', redirectTo: '/login' },
  { path: '**', redirectTo: '/login' },
];

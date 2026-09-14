import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as CryptoJS from 'crypto-js';
import { ApiService } from './api.service';
import { AppUser, LoginResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  login(usuario: string, password: string): Observable<LoginResponse> {
    const claveMd5 = CryptoJS.MD5(password).toString();
    return this.api.login(usuario, claveMd5).pipe(
      tap((res) => {
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('usuario', res.user?.usuario ?? '');
        localStorage.setItem('nombre', res.user?.nombre ?? '');
        localStorage.setItem('permisos', JSON.stringify(res.permisos ?? []));
      }),
    );
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('usuario');
    localStorage.removeItem('nombre');
    localStorage.removeItem('permisos');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('user');
  }

  get user(): AppUser | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppUser;
    } catch {
      return null;
    }
  }

  get nombre(): string {
    return localStorage.getItem('nombre') ?? '';
  }

  get usuario(): string {
    return localStorage.getItem('usuario') ?? '';
  }
}

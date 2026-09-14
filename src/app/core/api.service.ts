import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Cuenta,
  DashboardPagos,
  DashboardParams,
  Empresa,
  LoginResponse,
  Pago,
  Retenciones,
} from './models';

/** Desenvuelve respuestas que pueden venir como `{data}` o crudas. */
function unwrap<T>(r: unknown): T {
  if (r && typeof r === 'object' && 'data' in (r as Record<string, unknown>)) {
    return (r as { data: T }).data;
  }
  return r as T;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  readonly base = environment.apiUrl;
  /** Base para archivos servidos por el backend (sin /api). */
  readonly fileBase = environment.apiUrl.replace('/api', '');

  /** Cuenta seleccionada, compartida entre la bandeja y el detalle. */
  readonly cuentaSeleccionada = signal<Cuenta | null>(null);

  login(usuario: string, claveMd5: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, {
      usuario,
      clave: claveMd5,
    });
  }

  getCuentas(estado: string): Observable<Cuenta[]> {
    return this.http
      .get<unknown>(`${this.base}/cxp/cuentas`, { params: { estado } })
      .pipe(map((r) => unwrap<Cuenta[]>(r) ?? []));
  }

  updateEstado(
    id: number,
    estado: string,
    usuario: string,
    observacion: string,
  ): Observable<unknown> {
    return this.http.patch<unknown>(`${this.base}/cxp/cuentas/${id}/estado`, {
      estado,
      usuario,
      observacion,
    });
  }

  getRetenciones(id: number): Observable<Retenciones> {
    return this.http
      .get<unknown>(`${this.base}/cxp/cuentas/${id}/retenciones`)
      .pipe(map((r) => unwrap<Retenciones>(r) ?? {}));
  }

  getPagos(cuentaId: number): Observable<Pago[]> {
    return this.http
      .get<unknown>(`${this.base}/cxp/cuentas/${cuentaId}/pagos`)
      .pipe(map((r) => unwrap<Pago[]>(r) ?? []));
  }

  getDashboardPagos(params: DashboardParams): Observable<DashboardPagos> {
    let httpParams = new HttpParams();
    if (params.desde) httpParams = httpParams.set('desde', params.desde);
    if (params.hasta) httpParams = httpParams.set('hasta', params.hasta);
    if (params.empresa_id !== undefined && params.empresa_id !== null && params.empresa_id !== '') {
      httpParams = httpParams.set('empresa_id', String(params.empresa_id));
    }
    return this.http
      .get<unknown>(`${this.base}/cxp/dashboard/pagos`, { params: httpParams })
      .pipe(map((r) => unwrap<DashboardPagos>(r)));
  }

  getEmpresas(): Observable<Empresa[]> {
    return this.http
      .get<unknown>(`${this.base}/company`)
      .pipe(map((r) => unwrap<Empresa[]>(r) ?? []));
  }

  /** Construye la URL absoluta de un soporte (relativo o absoluto). */
  fileUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const sep = path.startsWith('/') ? '' : '/';
    return `${this.fileBase}${sep}${path}`;
  }
}

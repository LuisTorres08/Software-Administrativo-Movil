export interface AppUser {
  id: number;
  usuario: string;
  nombre: string;
  email?: string;
  ver_todas?: number | boolean;
  [key: string]: unknown;
}

export interface LoginResponse {
  message?: string;
  user: AppUser;
  permisos: unknown[];
}

export interface Cuenta {
  id: number;
  numero_lote?: string | number;
  estado: string;
  empresa?: string;
  empresa_abreviatura?: string;
  beneficiario?: string;
  nit_beneficiario?: string;
  concepto?: string;
  centro_costo?: string;
  tipo?: string;
  fecha_vencimiento?: string;
  valor_solicitado?: number | string;
  valor_pagado?: number | string;
  valor_pendiente?: number | string;
  tiene_soporte?: boolean | number;
  link?: string;
  numero_factura?: string;
  revisado_por?: string;
  aprobado_por?: string;
  created_at?: string;
}

export interface Retenciones {
  total_retenciones?: number | string | null;
  valor_neto?: number | string | null;
  iva?: number | string | null;
  retefuente?: number | string | null;
  reteica?: number | string | null;
  reteiva?: number | string | null;
}

export interface Pago {
  id: number;
  valor?: number | string;
  fecha_pago?: string;
  banco?: string;
  numero_cuenta?: string;
  soporte_url?: string;
  referencia?: string;
  observacion?: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  [key: string]: unknown;
}

export interface DashboardPagos {
  total_pagado: number;
  num_pagos: number;
  por_empresa: { empresa_id: number; empresa: string; total: number; num_pagos: number }[];
  por_empresa_mes: { mes: string; empresa: string; total: number }[];
  por_proveedor: { proveedor: string; nit: string; total: number; num_pagos: number }[];
  por_centro_costo: { centro_costo: string; total: number; num_pagos: number }[];
}

export interface DashboardParams {
  desde?: string;
  hasta?: string;
  empresa_id?: number | string;
}

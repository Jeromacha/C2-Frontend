// src/types/bolso.ts
export interface Bolso {
  id: string;              // PK no serial
  nombre: string;
  color: string;
  precio: number;
  observaciones?: string | null;
  cantidad: number;
}

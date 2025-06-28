import { Calificacion } from "./calificacion";

export interface Servicio {
  id?: string;

  // Usuarios involucrados
  clienteUid: string;
  prestadorUid: string;

  // Tipos de solicitud
  requiereVisita: boolean;        // true si es solo una visita técnica
  visitaRealizada: boolean;       // true cuando se realiza
  visitaPagada: boolean;          // true cuando se paga la visita
  costoVisita?: number;           // valor de la visita

  // Fechas
  fechaAgendamiento: string;
  fechaVisita?: string;
  fechaEjecucion?: string;

  // Presupuesto y pagos del servicio (si no es solo visita)
  presupuestoEstimado?: number;
  montoFinal?: number;
  estadoPago: 'pendiente' | 'pagado' | 'cancelado';

  // Calificaciones
  calificacionCliente?: Calificacion;
  calificacionPrestador?: Calificacion;

  // Comentarios
  comentarioCliente?: string;
  comentarioPrestador?: string;

  estado: 'pendiente' | 'en proceso' | 'completado' | 'cancelado' | 'visita'| 'reagendado'| 'reagendar'|'completado cliente'|'completado prestador';

  creadoEn: string;
}

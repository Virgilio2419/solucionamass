export interface Calificacion {
  id?: string;
  calificadoUid: string;        // Usuario que recibe la calificación
  calificadorUid: string;       // Usuario que califica
  nombreCalificador?: string;
  tipo: 'prestador' | 'cliente';
  puntuacion: number;           // 1 a 5
  comentario?: string;
  fecha: string;
  idReferencia?: string;
}
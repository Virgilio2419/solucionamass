export interface Usuario {
promedioCalificacion: any;
comentarios: any;
  id?: string;
  fotoPerfilBase64?: string | null;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  region: string;
  comuna: string;
  fechaNacimiento: string;
  rut: string;
  numeroDocumento: string;
  esPrestador: boolean;
  especialidad?: string;
  certificaciones?: {
    institucionCertifica: string;
    codigoCertificado: string;
  }[];

  // Nuevo campo
  horarioLaboral?: {
    dia: string;
    desde: string; // HH:mm
    hasta: string; // HH:mm
    noDisponible: boolean;
  }[];

  calificacionPromedio?: number;
  cantidadCalificaciones?: number;
}

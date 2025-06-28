import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, getDoc,updateDoc } from '@angular/fire/firestore';
import { Servicio } from '../models/servicio';
import { Usuario } from '../models/usuario';
import { Calificacion } from '../models/calificacion';


export interface ServicioConPrestador extends Servicio {
  prestadorDatos?: Usuario;
}

@Injectable({
  providedIn: 'root'
})
export class ServicioService {
  constructor(private firestore: Firestore) {}

  async agendarServicio(servicio: Servicio) {
    const ref = collection(this.firestore, 'servicios');
    return await addDoc(ref, servicio);
  }

  async getServiciosByCliente(uid: string): Promise<Servicio[]> {
    const colRef = collection(this.firestore, 'servicios');
    const q = query(colRef, where('clienteUid', '==', uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Servicio));
  }

  // Nuevo método que une datos del prestador
  async getServiciosByClienteConPrestador(uid: string): Promise<ServicioConPrestador[]> {
    const servicios = await this.getServiciosByCliente(uid);
    const serviciosConPrestador: ServicioConPrestador[] = [];

    for (const servicio of servicios) {
      if (servicio.prestadorUid) {
        const prestadorRef = doc(this.firestore, 'usuarios', servicio.prestadorUid);
        const prestadorSnap = await getDoc(prestadorRef);
        const prestadorDatos = prestadorSnap.exists() ? prestadorSnap.data() as Usuario : undefined;
        serviciosConPrestador.push({ ...servicio, prestadorDatos });
      } else {
        serviciosConPrestador.push(servicio);
      }
    }
    return serviciosConPrestador;
  }
  // Obtener servicios donde soy el prestador
async getServiciosByPrestador(uid: string): Promise<Servicio[]> {
  const colRef = collection(this.firestore, 'servicios');
  const q = query(colRef, where('prestadorUid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Servicio));
}

// Actualizar estado del servicio
async actualizarEstado(id: string, nuevoEstado: string) {
  const docRef = doc(this.firestore, 'servicios', id);
  return await updateDoc(docRef, { estado: nuevoEstado });
}

// Reagendar con nueva fecha
async reagendarServicio(id: string, nuevaFechaISO: string) {
  const docRef = doc(this.firestore, 'servicios', id);
  return await updateDoc(docRef, { fechaAgendamiento: nuevaFechaISO });
}

// Obtener todas las calificaciones
async getCalificaciones(): Promise<Calificacion[]> {
  const colRef = collection(this.firestore, 'calificaciones');
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Calificacion));
}

async actualizarMontoFinal(servicioId: string, monto: number) {
  const servicioRef = doc(this.firestore, 'servicios', servicioId);
  await updateDoc(servicioRef, { montoFinal: monto });
}

}

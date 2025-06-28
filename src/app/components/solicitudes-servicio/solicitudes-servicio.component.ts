import { Component, OnInit, OnDestroy } from '@angular/core'; 
import { ServicioService } from 'src/app/services/servicio.service';
import { Servicio } from 'src/app/models/servicio';
import { Auth, user } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { AlertController } from '@ionic/angular';
import { formatISO } from 'date-fns';
import { collection, addDoc, Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-solicitudes-servicio',
  templateUrl: './solicitudes-servicio.component.html',
  styleUrls: ['./solicitudes-servicio.component.scss'],
  standalone:false
})
export class SolicitudesServicioComponent implements OnInit, OnDestroy {
  solicitudes: Servicio[] = [];
  solicitudesFiltradas: Servicio[] = [];
  uidPrestador: string | null = null;
  authSub?: Subscription;
  filtro: string = '';
  serviciosConConflicto: Set<string> = new Set();
  estadoResumen: { [estado: string]: number } = {};
nombreUsuario: string = '';
  constructor(
    private servicioService: ServicioService,
    private auth: Auth,
    private alertController: AlertController,
    private firestore: Firestore
  ) {}

ngOnInit() {
  this.authSub = user(this.auth).subscribe(async (u) => {
    this.uidPrestador = u?.uid ?? null;
    this.nombreUsuario = u?.displayName ?? 'prestador'; // 👈 obtenemos nombre para mostrar

    if (this.uidPrestador) {
      const todas = await this.servicioService.getServiciosByPrestador(this.uidPrestador);

      this.solicitudes = todas.filter(
        (s) => !['completado', 'cancelado'].includes(this.normalizarEstado(s.estado))
      );

      this.filtrarSolicitudes();
    }
  });
}

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  async aceptar(servicio: Servicio) {
    await this.servicioService.actualizarEstado(servicio.id!, 'en proceso');
    alert('✅ Servicio aceptado');
    await this.refresh();
  }

  async rechazar(servicio: Servicio) {
    await this.servicioService.actualizarEstado(servicio.id!, 'cancelado');
    alert('❌ Servicio rechazado');
    await this.refresh();
  }

  async reagendar(servicio: Servicio) {
    const nuevaFecha = await this.solicitarNuevaFecha();
    if (!nuevaFecha) return;

    await this.servicioService.reagendarServicio(servicio.id!, nuevaFecha);
    await this.servicioService.actualizarEstado(servicio.id!, 'reagendado');
    alert('📅 Servicio reagendado');
    await this.refresh();
  }

  private async solicitarNuevaFecha(): Promise<string | null> {
    let fechaResultado: string | null = null;

    const alert = await this.alertController.create({
      header: 'Reagendar Servicio',
      inputs: [
        { name: 'fecha', type: 'date', placeholder: 'Fecha' },
        { name: 'hora', type: 'time', placeholder: 'Hora' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: (data) => {
            if (!data.fecha || !data.hora) return false;
            const fechaCompleta = new Date(`${data.fecha}T${data.hora}`);
            if (isNaN(fechaCompleta.getTime())) return false;
            fechaResultado = formatISO(fechaCompleta);
            return true;
          }
        }
      ]
    });

    await alert.present();
    await alert.onDidDismiss();

    return fechaResultado;
  }

  private async refresh() {
    if (this.uidPrestador) {
      const todas = await this.servicioService.getServiciosByPrestador(this.uidPrestador);

      this.solicitudes = todas.filter(s =>
        !['completado', 'cancelado'].includes(this.normalizarEstado(s.estado))
      );

      this.filtrarSolicitudes();
      this.detectarConflictos();
    }
  }

  normalizarEstado(estado: string | undefined): string {
    return (estado || '').trim().toLowerCase();
  }

  filtrarSolicitudes() {
  const filtroLower = this.filtro.trim().toLowerCase();

  this.solicitudesFiltradas = this.solicitudes.filter(s => {
    const estado = this.normalizarEstado(s.estado);

    // Solo mostrar los estados permitidos
    if (!['en proceso', 'reagendado', 'reagendar','pendiente'].includes(estado)) {
      return false;
    }

    const cliente = (s.clienteUid ?? '').toLowerCase();
    const fecha = (s.fechaAgendamiento || '').toString().toLowerCase();

    return (
      cliente.includes(filtroLower) ||
      estado.includes(filtroLower) ||
      fecha.includes(filtroLower)
    );
  });

  // Ordenar por fecha próxima
  this.solicitudesFiltradas.sort((a, b) => {
    const fechaA = new Date(a.fechaAgendamiento!).getTime();
    const fechaB = new Date(b.fechaAgendamiento!).getTime();
    const hoy = new Date().getTime();

    const diffA = Math.abs(fechaA - hoy);
    const diffB = Math.abs(fechaB - hoy);

    return diffA - diffB;
  });

  // Crear resumen excluyendo completado y cancelado
  const resumen: { [estado: string]: number } = {};
  for (const s of this.solicitudesFiltradas) {
    const estado = this.normalizarEstado(s.estado);
    resumen[estado] = (resumen[estado] || 0) + 1;
  }

  this.estadoResumen = resumen;

  this.detectarConflictos();
}

  esEstado(servicio: Servicio, estadoBuscado: string): boolean {
    return this.normalizarEstado(servicio.estado) === estadoBuscado.toLowerCase();
  }

  private detectarConflictos() {
    this.serviciosConConflicto.clear();

    const serviciosOrdenados = [...this.solicitudesFiltradas]
      .filter(s => s.fechaAgendamiento)
      .sort((a, b) =>
        new Date(a.fechaAgendamiento!).getTime() - new Date(b.fechaAgendamiento!).getTime()
      );

    for (let i = 0; i < serviciosOrdenados.length - 1; i++) {
      const actual = new Date(serviciosOrdenados[i].fechaAgendamiento!);
      const siguiente = new Date(serviciosOrdenados[i + 1].fechaAgendamiento!);

      const diffMinutos = (siguiente.getTime() - actual.getTime()) / (1000 * 60);

      if (diffMinutos < 60) {
        this.serviciosConConflicto.add(serviciosOrdenados[i].id!);
        this.serviciosConConflicto.add(serviciosOrdenados[i + 1].id!);
      }
    }
  }

async finalizarServicio(servicio: Servicio) {
  const estadoActual = this.normalizarEstado(servicio.estado);

  if (servicio.montoFinal == null || servicio.montoFinal === undefined) {
    const alert = await this.alertController.create({
      header: 'Monto Final del Servicio',
      inputs: [
        {
          name: 'monto',
          type: 'number',
          placeholder: 'Ingrese el monto final',
          min: 0
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const monto = parseFloat(data.monto);

            if (isNaN(monto) || monto < 0) {
              window.alert('❌ El monto debe ser un número válido.');
              return false; // no cierra el alert
            }

            // Ejecutar la parte async fuera del handler
            this.actualizarMontoFinalYFinalizar(servicio, monto);

            return true; // cierra el alert
          }
        }
      ]
    });

    await alert.present();
    return; // importante para que no continúe la función sin monto
  }

  // Si ya tiene monto, sigue el flujo normal
  if (estadoActual === 'en proceso') {
    await this.servicioService.actualizarEstado(servicio.id!, 'completado prestador');
    await this.solicitarCalificacion(servicio.clienteUid, 'cliente', 'Cliente', servicio.id);
  } else if (estadoActual === 'completado cliente') {
    await this.servicioService.actualizarEstado(servicio.id!, 'completado');
    await this.solicitarCalificacion(this.uidPrestador!, 'prestador', 'Prestador', servicio.id);
  }

  await this.refresh();
}

async actualizarMontoFinalYFinalizar(servicio: Servicio, monto: number) {
  try {
    await this.servicioService.actualizarMontoFinal(servicio.id!, monto);
    servicio.montoFinal = monto; // actualizar localmente
    await this.finalizarServicio(servicio); // llamar de nuevo ya con monto
  } catch (error) {
    console.error('Error actualizando monto final:', error);
    window.alert('❌ Error al guardar el monto final, intente de nuevo.');
  }
}


async solicitarCalificacion(
  calificadoUid: string,
  tipo: 'cliente' | 'prestador',
  nombre: string,
  idReferencia?: string
) {
  const alerta = await this.alertController.create({
    header: `Califica a ${nombre}`,
    inputs: [
      {
        name: 'puntuacion',
        type: 'number',
        min: 1,
        max: 5,
        placeholder: 'Puntuación (1 a 5)',
        attributes: { min: 1, max: 5, step: 1 },
      },
      {
        name: 'comentario',
        type: 'text',
        placeholder: 'Comentario (máx 50 caracteres)',
        attributes: { maxlength: 50 }
      }
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Enviar',
        handler: async (data) => {
          const puntuacion = Number(data.puntuacion);

          if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
            alert('La puntuación debe ser un número entero entre 1 y 5.');
            return false; // Evita cerrar el alert
          }

          try {
            if (!calificadoUid || !this.auth.currentUser?.uid) return false;

            const calificacion = {
              calificadoUid,
              calificadorUid: this.auth.currentUser.uid,
              tipo,
              puntuacion,
              comentario: data.comentario?.trim() || '',
              fecha: new Date().toISOString(),
              idReferencia: idReferencia || null
            };

            await addDoc(collection(this.firestore, 'calificaciones'), calificacion);
            alert('✅ Calificación enviada.');
            return true; // Permite cerrar el alert
          } catch (err) {
            console.error('Error al enviar calificación:', err);
            alert('❌ Error al enviar la calificación, intenta de nuevo.');
            return false; // Evita cerrar el alert
          }
        }
      }
    ]
  });

  await alerta.present();
}



}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Usuario } from 'src/app/models/usuario';
import { Servicio } from 'src/app/models/servicio';
import { UserService } from 'src/app/services/user.service';
import { ServicioService } from 'src/app/services/servicio.service';
import { Auth, user } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { AlertController } from '@ionic/angular';
import { formatISO } from 'date-fns';
import { Router } from '@angular/router';
import { Calificacion } from 'src/app/models/calificacion';

type UsuarioConCalificacion = Usuario & {
  promedioCalificacion?: number;
  comentarios?: string[];
};

@Component({
  selector: 'app-prestadores',
  templateUrl: './prestadores.component.html',
  styleUrls: ['./prestadores.component.scss'],
  standalone: false,
})
export class PrestadoresPage implements OnInit, OnDestroy {
  prestadores: Usuario[] = [];
  prestadoresFiltrados: Usuario[] = [];
  fechaSeleccionadaISO: string | null = null;
  comunasDisponibles: string[] = [];
  especialidadesDisponibles: string[] = [];
  filtroComuna: string = '';
  filtroEspecialidad: string = '';
  uidCliente: string | null = null;
  private authSubscription?: Subscription;

  constructor(
    private userService: UserService,
    private servicioService: ServicioService,
    private auth: Auth,
    private alertController: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    this.authSubscription = user(this.auth).subscribe(u => {
      this.uidCliente = u?.uid ?? null;
    });

    this.cargarPrestadores();
  }

  async cargarPrestadores() {
    const [prestadores, calificaciones] = await Promise.all([
      this.userService.getPrestadores(),
      this.servicioService.getCalificaciones()
    ]);

    this.prestadores = prestadores.map(p => {
      const calificacionesPrestador = calificaciones.filter(
        c => c.calificadoUid === p.id && c.tipo === 'prestador'
      );

      const promedio = calificacionesPrestador.length > 0
        ? calificacionesPrestador.reduce((sum, c) => sum + c.puntuacion, 0) / calificacionesPrestador.length
        : 0;

      const comentarios = calificacionesPrestador
        .map(c => c.comentario)
        .filter((comentario): comentario is string => !!comentario)
        .slice(-5)
        .reverse();

      return {
        ...p,
        promedioCalificacion: promedio,
        comentarios: comentarios
      } as UsuarioConCalificacion;
    });

    this.comunasDisponibles = [...new Set(this.prestadores.map(p => p.comuna).filter(Boolean))];
    this.especialidadesDisponibles = [
      ...new Set(this.prestadores.map(p => p.especialidad).filter((e): e is string => !!e))
    ];
    this.filtrarPrestadores();
  }

  filtrarPrestadores() {
    this.prestadoresFiltrados = this.prestadores.filter(p => {
      const comunaMatch = this.filtroComuna ? p.comuna === this.filtroComuna : true;
      const especialidadMatch = this.filtroEspecialidad ? p.especialidad === this.filtroEspecialidad : true;
      return comunaMatch && especialidadMatch;
    });
  }

  async verificarDuplicado(prestadorId: string): Promise<boolean> {
    const servicios = await this.servicioService.getServiciosByCliente(this.uidCliente!);
    return servicios.some(s =>
      s.prestadorUid === prestadorId &&
      ['pendiente', 'visita', 'en_proceso'].includes(s.estado)
    );
  }

  async solicitarFecha(): Promise<string | null> {
    const alert = await this.alertController.create({
      header: 'Selecciona la fecha',
      inputs: [
        { name: 'fecha', type: 'date', placeholder: 'Fecha del servicio' },
        { name: 'hora', type: 'time', placeholder: 'Hora del servicio' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: (data) => {
            if (!data.fecha || !data.hora) {
              window.alert('Debes ingresar fecha y hora');
              return false;
            }
            const fechaCompleta = new Date(`${data.fecha}T${data.hora}`);
            if (isNaN(fechaCompleta.getTime())) {
              window.alert('Fecha u hora inválida');
              return false;
            }
            this.fechaSeleccionadaISO = formatISO(fechaCompleta);
            return true;
          }
        }
      ]
    });
    await alert.present();
    await alert.onDidDismiss();
    return this.fechaSeleccionadaISO ?? null;
  }

  async agendarServicio(prestador: Usuario) {
    if (!this.uidCliente || !prestador.id) {
      alert('No se pudo identificar al cliente o prestador');
      return;
    }

    const yaAgendado = await this.verificarDuplicado(prestador.id);
    if (yaAgendado) {
      alert('⚠️ Ya tienes un servicio pendiente con este prestador');
      return;
    }

    const fechaAgendada = await this.solicitarFecha();
    if (!fechaAgendada) return;

    const error = this.validarHorario(prestador, fechaAgendada);
    if (error) {
      alert(error);
      return;
    }

    const confirmacion = await this.alertController.create({
      header: 'Confirmar agendamiento',
      message:
        'El servicio tiene un valor base de $20.000.\n\n' +
        'Este monto NO se cobrará si decides realizar el servicio completo presupuestado al momento de la visita técnica.\n\n' +
        '¿Deseas continuar con el agendamiento?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: async () => {
            const servicio: Servicio = {
              clienteUid: this.uidCliente!,
              prestadorUid: prestador.id!,
              requiereVisita: false,
              visitaRealizada: false,
              visitaPagada: false,
              presupuestoEstimado: 20000,
              fechaAgendamiento: fechaAgendada,
              estadoPago: 'pendiente',
              estado: 'pendiente',
              creadoEn: new Date().toISOString()
            };
            await this.servicioService.agendarServicio(servicio);
            alert('✅ Servicio agendado');
            this.router.navigate(['/servicios-agendados-cliente']);
          }
        }
      ]
    });
    await confirmacion.present();
  }

  async agendarVisita(prestador: Usuario) {
    if (!this.uidCliente || !prestador.id) {
      alert('No se pudo identificar al cliente o prestador');
      return;
    }

    const yaAgendado = await this.verificarDuplicado(prestador.id);
    if (yaAgendado) {
      alert('⚠️ Ya tienes un servicio pendiente con este prestador');
      return;
    }

    const fechaAgendada = await this.solicitarFecha();
    if (!fechaAgendada) return;

    const error = this.validarHorario(prestador, fechaAgendada);
    if (error) {
      alert(error);
      return;
    }

    const confirmacion = await this.alertController.create({
      header: 'Confirmar visita técnica',
      message:
        'La visita técnica tiene un valor base de $15.000.\n\n' +
        'Este monto NO se cobrará si decides realizar el servicio completo presupuestado durante la visita.\n\n' +
        '¿Deseas continuar con la solicitud de visita?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: async () => {
            const servicio: Servicio = {
              clienteUid: this.uidCliente!,
              prestadorUid: prestador.id!,
              requiereVisita: true,
              visitaRealizada: false,
              visitaPagada: false,
              costoVisita: 15000,
              fechaAgendamiento: fechaAgendada,
              estadoPago: 'pendiente',
              estado: 'visita',
              creadoEn: new Date().toISOString()
            };
            await this.servicioService.agendarServicio(servicio);
            alert('✅ Visita técnica agendada');
            this.router.navigate(['/servicios-agendados-cliente']);
          }
        }
      ]
    });
    await confirmacion.present();
  }

  async verComentarios(prestador: Usuario) {
    const comentarios = (prestador as any).comentarios;
    const mensaje = comentarios?.length
      ? comentarios.map((c: any) => `• ${c}`).join('\n\n')
      : 'Este prestador aún no tiene comentarios.';

    const alert = await this.alertController.create({
      header: 'Comentarios recientes',
      message: mensaje,
      buttons: ['Cerrar'],
      mode: 'ios'
    });

    await alert.present();
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  private validarHorario(prestador: Usuario, fechaAgendada: string): string | null {
    const fechaHora = new Date(fechaAgendada);
    const ahora = new Date();

    if (fechaHora <= ahora) {
      return '⚠️ Debes seleccionar una fecha y hora futura';
    }

    if (!prestador.horarioLaboral || prestador.horarioLaboral.length === 0) {
      return '⚠️ Este prestador no tiene horario laboral definido';
    }

    const diaSemana = fechaHora.toLocaleDateString('es-CL', { weekday: 'long' }).toLowerCase();
    const horarioDia = prestador.horarioLaboral.find(h => h.dia.toLowerCase() === diaSemana);

    if (!horarioDia || horarioDia.noDisponible) {
      return `⚠️ Este prestador no está disponible los días ${diaSemana}`;
    }

    if (!horarioDia.desde || !horarioDia.hasta) {
      return `⚠️ El horario laboral del día ${diaSemana} no está completo`;
    }

    const [hDesde, mDesde] = horarioDia.desde.split(':').map(Number);
    const inicio = new Date(fechaHora);
    inicio.setHours(hDesde, mDesde, 0, 0);

    const [hHasta, mHasta] = horarioDia.hasta.split(':').map(Number);
    const fin = new Date(fechaHora);
    fin.setHours(hHasta, mHasta, 0, 0);

    if (fechaHora < inicio || fechaHora > fin) {
      return `⚠️ Debes seleccionar una hora dentro del horario laboral (${horarioDia.desde} - ${horarioDia.hasta})`;
    }

    return null;
  }
}

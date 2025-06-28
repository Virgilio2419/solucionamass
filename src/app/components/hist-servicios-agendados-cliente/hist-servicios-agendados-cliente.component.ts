import { Component, OnInit, OnDestroy } from '@angular/core';
import { ServicioService, ServicioConPrestador } from 'src/app/services/servicio.service';
import { Auth, user } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-hist-servicios-agendados-cliente',
  templateUrl: './hist-servicios-agendados-cliente.component.html',
  styleUrls: ['./hist-servicios-agendados-cliente.component.scss'],
  standalone:false
})
export class HistServiciosAgendadosClienteComponent implements OnInit, OnDestroy {
  servicios: ServicioConPrestador[] = [];
  serviciosFiltrados: ServicioConPrestador[] = [];
  uidCliente: string | null = null;
  authSub?: Subscription;
  filtro: string = '';

  constructor(
    private servicioService: ServicioService,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.authSub = user(this.auth).subscribe(async u => {
      if (u?.uid) {
        this.uidCliente = u.uid;
        await this.cargarServicios();
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  async cargarServicios() {
    if (!this.uidCliente) return;
    const todos = await this.servicioService.getServiciosByClienteConPrestador(this.uidCliente);
    this.servicios = todos.filter(s =>
      ['cancelado', 'completo','pagado'].includes(this.normalizarEstado(s.estado))
    );
    this.serviciosFiltrados = [...this.servicios];
  }

  normalizarEstado(estado: string | undefined): string {
    return (estado || '').trim().toLowerCase();
  }

  filtrarServicios() {
    const filtroLower = this.filtro.trim().toLowerCase();

    this.serviciosFiltrados = this.servicios.filter(s => {
      const nombreCompleto = `${s.prestadorDatos?.nombres ?? ''} ${s.prestadorDatos?.apellidos ?? ''}`.toLowerCase();
      const estado = this.normalizarEstado(s.estado);
      const fecha = s.fechaAgendamiento?.toLowerCase?.() ?? '';

      return (
        nombreCompleto.includes(filtroLower) ||
        estado.includes(filtroLower) ||
        fecha.includes(filtroLower)
      );
    });
  }
}

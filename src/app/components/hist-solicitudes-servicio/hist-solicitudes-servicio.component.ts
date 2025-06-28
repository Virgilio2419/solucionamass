import { Component, OnInit, OnDestroy } from '@angular/core';
import { ServicioService } from 'src/app/services/servicio.service';
import { Servicio } from 'src/app/models/servicio';
import { Auth, user } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-solicitudes-servicio',
  templateUrl: './hist-solicitudes-servicio.component.html',
  styleUrls: ['./hist-solicitudes-servicio.component.scss'],
  standalone: false
})
export class histSolicitudesServicioComponent implements OnInit, OnDestroy {
  solicitudes: Servicio[] = [];
  solicitudesFiltradas: Servicio[] = [];
  uidPrestador: string | null = null;
  authSub?: Subscription;
  filtro: string = '';

  constructor(
    private servicioService: ServicioService,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.authSub = user(this.auth).subscribe(async u => {
      this.uidPrestador = u?.uid ?? null;
      if (this.uidPrestador) {
        const todas = await this.servicioService.getServiciosByPrestador(this.uidPrestador);
        this.solicitudes = todas.filter(s =>
          ['cancelado', 'completo', 'completado'].includes(this.normalizarEstado(s.estado))
        );
        this.solicitudesFiltradas = [...this.solicitudes];
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  normalizarEstado(estado: string | undefined): string {
    return (estado || '').trim().toLowerCase();
  }

  filtrarSolicitudes() {
    const filtroLower = this.filtro.trim().toLowerCase();

    this.solicitudesFiltradas = this.solicitudes.filter(s => {
      const cliente = (s.clienteUid ?? '').toLowerCase();
      const estado = this.normalizarEstado(s.estado);
      const fecha = s.fechaAgendamiento?.toLowerCase?.() ?? '';

      return (
        cliente.includes(filtroLower) ||
        estado.includes(filtroLower) ||
        fecha.includes(filtroLower)
      );
    });
  }
}

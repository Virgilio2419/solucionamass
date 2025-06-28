import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserService } from 'src/app/services/user.service';
import { Usuario } from 'src/app/models/usuario';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone:false
})
export class ProfileComponent implements OnInit, OnDestroy {
  usuario?: Usuario;
  cargando = true;
  error?: string;
  private authSub?: Subscription;

  constructor(
    private userService: UserService
  ) {}

  ngOnInit() {
    this.authSub = this.userService.getAuthState().subscribe(async user => {
      this.cargando = true;

      if (!user?.email) {
        this.usuario = undefined;
        this.error = 'Usuario no autenticado.';
        this.cargando = false;
        return;
      }

      try {
        const usuarioDB = await this.userService.getUsuarioPorEmail(user.email);
        if (!usuarioDB) {
          this.error = 'Usuario no encontrado.';
        } else {
          this.usuario = usuarioDB;
        }
      } catch (err) {
        this.error = 'Error al obtener datos del usuario.';
        console.error(err);
      } finally {
        this.cargando = false;
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}
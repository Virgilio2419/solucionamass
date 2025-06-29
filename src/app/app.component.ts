import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from './services/user.service';
import { Usuario } from './models/usuario';
import { ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { OnDestroy } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone:false
})
export class AppComponent implements OnInit, OnDestroy {
  usuarioActual: Usuario | null = null;
  private sub?: Subscription;

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private auth: Auth
  ) {}

ngOnInit() {
  this.sub = this.userService.usuarioActual$.subscribe(usuario => {
    this.usuarioActual = usuario;
    this.cdr.detectChanges();

    const rutaActual = this.router.url;
    const esRutaDeTransbank = rutaActual.includes('return-transbank');

    // Si no hay usuario y no es la ruta de Transbank, redirigir
    if (!usuario && !esRutaDeTransbank) {
      this.router.navigate(['/main']);
    }
  });
}

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onLogout() {
    this.auth.signOut().then(() => {
      this.userService.actualizarUsuarioActual(null);
      this.router.navigate(['/login']);
    });
  }
}
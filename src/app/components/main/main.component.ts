import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: false,
})
export class MainComponent {
  telefono: string = '';
  nombre: string = '';

  constructor(private router: Router, private auth: Auth) {}

  buscarEspecialistas() {
    this.router.navigate(['/prestadores']);
  }

  onLogout() {
    this.auth.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }

  validarSoloNumeros(event: KeyboardEvent) {
    const charCode = event.charCode || event.keyCode;
    // Permite solo números (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  enviar() {
    if (this.telefono.length === 9 && this.nombre.length >= 5) {
      alert(`Teléfono: +56${this.telefono}\nNombre: ${this.nombre}`);
      // Aquí puedes agregar más lógica al enviar, por ejemplo navegación, API, etc.
    } else {
      alert('Por favor corrige los errores en el formulario');
    }
  }
}

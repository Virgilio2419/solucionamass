import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Usuario } from 'src/app/models/usuario';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements OnInit {

  formLogin: FormGroup;
  loginError: string = '';

  constructor(
    private userService: UserService,
    private router: Router
  ) {
    this.formLogin = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(5)])
    });
  }

  ngOnInit(): void {}

  get email() {
    return this.formLogin.get('email')!;
  }

  get password() {
    return this.formLogin.get('password')!;
  }

  async onLogin() {
    if (this.formLogin.invalid) return;

    this.loginError = '';

    try {
      await this.userService.login(this.formLogin.value);

const usuario: Usuario | null = await this.userService.getUsuarioActual();

if (usuario) {
  console.log('Usuario logeado:', usuario);
  console.log('esPrestador:', usuario.esPrestador);

  if (usuario.esPrestador === true) {
    this.router.navigate(['/main-prestador']);
  } else {
    this.router.navigate(['/main']);
  }
}

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        this.loginError = 'Usuario no encontrado.';
      } else if (error.code === 'auth/wrong-password') {
        this.loginError = 'Contraseña incorrecta.';
      } else if (error.code === 'auth/invalid-email') {
        this.loginError = 'Correo electrónico inválido.';
      } else if (error.code === 'auth/email-not-verified') {
        this.loginError = 'Debes verificar tu correo electrónico antes de ingresar.';
      } else {
        this.loginError = 'Error de autenticación. Intenta nuevamente.';
      }
    }
  }

  onLoginWithGoogle() {
  this.userService.loginWithGoogle()
    .then(async (response) => {
      const email = response.user.email;
      if (!email) {
        this.loginError = 'No se pudo obtener el correo electrónico.';
        return;
      }

      let usuario = await this.userService.getUsuarioPorEmail(email);

      if (usuario) {
        console.log('Perfil usuario existente (Google):', usuario);
      } else {
        // Crear nuevo usuario básico con datos del perfil de Google
        usuario = {
          email: email,
          nombres: response.user.displayName || '',
          apellidos: '',
          telefono: '',
          direccion: '',
          region: '',
          comuna: '',
          fechaNacimiento: '',
          rut: '',
          numeroDocumento: '',
          esPrestador: false,
          promedioCalificacion: null,
          comentarios: null
        };

        usuario = await this.userService.addUser(usuario);
        console.log('Nuevo usuario creado (Google):', usuario);
      }

      // Ahora usuario tiene id, actualizar BehaviorSubject con usuario completo
      this.userService.actualizarUsuarioActual(usuario);

      if (usuario.esPrestador) {
        this.router.navigate(['/profile']);
      } else {
        this.router.navigate(['/main']);
      }
    })
    .catch(error => {
      console.error(error);
      this.loginError = 'Error al iniciar sesión con Google.';
    });
}



  reenviarVerificacion() {
    const { email, password } = this.formLogin.value;
    if (!email || !password) {
      this.loginError = 'Ingresa tu correo y contraseña para reenviar el correo de verificación.';
      return;
    }

    const auth = getAuth();

    signInWithEmailAndPassword(auth, email, password)
      .then(cred => {
        if (cred.user.emailVerified) {
          this.loginError = 'Tu correo ya está verificado.';
          signOut(auth);
        } else {
          sendEmailVerification(cred.user)
            .then(() => {
              this.loginError = 'Correo de verificación reenviado.';
              signOut(auth);
            })
            .catch(() => {
              this.loginError = 'No se pudo enviar el correo de verificación.';
              signOut(auth);
            });
        }
      })
      .catch(error => {
        if (error.code === 'auth/user-not-found') {
          this.loginError = 'Usuario no encontrado.';
        } else if (error.code === 'auth/wrong-password') {
          this.loginError = 'Contraseña incorrecta.';
        } else {
          this.loginError = 'Error al intentar reenviar el correo.';
        }
      });
  }
}

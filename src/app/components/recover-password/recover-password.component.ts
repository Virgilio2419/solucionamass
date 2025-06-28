import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { UserService } from 'src/app/services/user.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-recover-password',
  templateUrl: './recover-password.component.html',
  styleUrls: ['./recover-password.component.scss'],
  standalone:false
})
export class RecoverPasswordComponent implements OnInit {
  form!: FormGroup;
  mensaje: string = '';

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController,
    private auth: Auth,
    private userService:UserService,
    private router:Router
  ) {}

  ngOnInit() {
  this.form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });
}

async onSubmit() {
  if (this.form.invalid) return;

  const email = this.form.value.email.trim();

  try {
    await this.userService.enviarResetPassword(email);
    this.mensaje = 'Se ha enviado un enlace a tu correo electrónico.';
    this.presentToast('Revisa tu correo para continuar con la recuperación.', 'success');

    // Espera 2 segundos para que el usuario vea el toast y luego navega a login
    setTimeout(() => {
      this.router.navigate(['login']);
    }, 2000);

  } catch (error: any) {
    console.log('Error al enviar reset password:', error);
    this.mensaje = '';
    const msg = this.getFirebaseErrorMessage(error.code);
    this.presentToast(msg, 'danger');
  }
}


  getFirebaseErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
        return 'No existe una cuenta con ese correo.';
      case 'auth/invalid-email':
        return 'El correo ingresado no es válido.';
      default:
        return 'Ocurrió un error. Intenta nuevamente.';
    }
  }

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
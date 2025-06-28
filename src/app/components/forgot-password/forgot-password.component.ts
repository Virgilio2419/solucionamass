import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone:false,
})
export class ForgotPasswordComponent implements OnInit {
  form!: FormGroup;
  mensaje: string = '';

  private auth: Auth = inject(Auth);  // ✅ SDK modular

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;

    const email = this.form.value.email;

    try {
      await sendPasswordResetEmail(this.auth, email); // ✅ SDK modular
      this.mensaje = 'Se ha enviado un enlace a tu correo electrónico.';
      this.presentToast('Revisa tu correo para continuar con la recuperación.', 'success');
    } catch (error: any) {
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

import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone:false
})
export class RegisterComponent  implements OnInit {

  formReg:FormGroup;
  
  constructor(
    private userService: UserService,
    private router: Router,
    private toastController: ToastController
  ) { 
    this.formReg= new FormGroup({
      email: new FormControl(),
      password: new FormControl()
    })
  }

  ngOnInit(): void {}

async onSubmit() {
  try {
    const response = await this.userService.register(this.formReg.value);
    await this.presentToast('Registro exitoso. Revisa tu correo para verificar la cuenta.', 'success');
    this.router.navigate(['/login']);
  } catch (error) {
    console.error(error);
    await this.presentToast('Ocurrió un error al registrar. Intenta nuevamente.', 'danger');
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

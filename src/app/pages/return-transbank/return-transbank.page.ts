import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { TransbankService } from 'src/app/services/transbank.service';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-return-transbank',
  templateUrl: './return-transbank.page.html',
  styleUrls: ['./return-transbank.page.scss'],
  standalone:false
})
export class ReturnTransbankPage implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private transbankService: TransbankService,
    private firestore: Firestore
  ) { }

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token_ws');
    const paymentId = this.route.snapshot.queryParamMap.get('paymentId');
    const servicioId = this.route.snapshot.queryParamMap.get('servicioId');

    console.log('Return page params:', { token, paymentId, servicioId });

    if (token && paymentId && servicioId) {
      await this.procesarRetorno(token, paymentId, servicioId);
    } else {
      await this.mostrarError('Parámetros de retorno inválidos');
    }
  }

  private async procesarRetorno(token: string, paymentId: string, servicioId: string) {
    const loading = await this.loadingController.create({
      message: 'Confirmando pago...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      this.transbankService.confirmTransaction(token).subscribe({
        next: async (response) => {
          console.log('Respuesta de Transbank:', response);
          
          if (response.response_code === 0) {
            await this.actualizarPagoExitoso(paymentId, servicioId, response);
            await loading.dismiss();
            
            const alert = await this.alertController.create({
              header: '¡Pago exitoso!',
              message: `Tu pago ha sido procesado correctamente. Código de autorización: ${response.authorization_code}`,
              buttons: [{
                text: 'Continuar',
                handler: () => {
                  this.router.navigate(['/tabs/tab2']); // Ajusta según tu tab de servicios
                }
              }]
            });
            await alert.present();
            
          } else {
            await this.actualizarPagoRechazado(paymentId);
            await loading.dismiss();
            await this.mostrarError('El pago fue rechazado por el banco. Intenta con otra tarjeta.');
          }
        },
        error: async (error) => {
          await loading.dismiss();
          console.error('Error al confirmar con Transbank:', error);
          await this.mostrarError('Error al confirmar el pago con Transbank.');
        }
      });

    } catch (error) {
      await loading.dismiss();
      console.error('Error al procesar retorno:', error);
      await this.mostrarError('Error al procesar el pago. Contacta con soporte.');
    }
  }

  private async actualizarPagoExitoso(paymentId: string, servicioId: string, response: any) {
    try {
      const paymentRef = doc(this.firestore, 'payments', paymentId);
      await updateDoc(paymentRef, {
        status: 'approved',
        authorizationCode: response.authorization_code,
        paymentTypeCode: response.payment_type_code,
        cardNumber: response.card_detail?.card_number,
        transactionDate: response.transaction_date,
        updatedAt: new Date().toISOString()
      });

      const servicioRef = doc(this.firestore, 'servicios', servicioId);
      await updateDoc(servicioRef, {
        estado: 'pagado',
        fechaPago: new Date().toISOString(),
        codigoAutorizacion: response.authorization_code
      });

      console.log('Pago actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar pago exitoso:', error);
    }
  }

  private async actualizarPagoRechazado(paymentId: string) {
    try {
      const paymentRef = doc(this.firestore, 'payments', paymentId);
      await updateDoc(paymentRef, {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error al actualizar pago rechazado:', error);
    }
  }

  private async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Error en el pago',
      message: mensaje,
      buttons: [{
        text: 'Volver',
        handler: () => {
          this.router.navigate(['/tabs/tab2']); // Ajusta según tu tab de servicios
        }
      }]
    });
    await alert.present();
  }
}
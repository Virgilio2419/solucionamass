import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { PaymentService } from 'src/app/services/payment.service';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-return-transbank',
  templateUrl: './return-transbank.component.html',
  styleUrls: ['./return-transbank.component.scss'],
  standalone:false
})
export class ReturnTransbankComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private paymentService: PaymentService,
    private firestore: Firestore
  ) {}

  async ngOnInit() {
    const token     = this.route.snapshot.queryParamMap.get('token_ws');
    const paymentId = this.route.snapshot.queryParamMap.get('paymentId');
    const servicioId= this.route.snapshot.queryParamMap.get('servicioId');

    console.log('Params recibidos:', { token, paymentId, servicioId });

    if (!token || !paymentId || !servicioId) {
      return this.showError('Parámetros de retorno inválidos.');
    }

    const loading = await this.loadingCtrl.create({ message: 'Confirmando pago...' });
    await loading.present();

    try {
      const resp = await this.paymentService.confirmPayment(token);
      console.log('Respuesta confirmPayment:', resp);

      if (resp.response_code === 0) {
        await this.markPaymentSuccess(paymentId, servicioId, resp);
        await loading.dismiss();

        const alert = await this.alertCtrl.create({
          header: '¡Pago exitoso!',
          message: `Autorización: ${resp.authorization_code}`,
          buttons: [{
            text: 'Continuar',
            handler: () => this.router.navigate(['/servicios-agendados-cliente'])
          }]
        });
        await alert.present();

      } else {
        await this.markPaymentFailed(paymentId);
        await loading.dismiss();
        await this.showError('El pago fue rechazado por Transbank');
      }

    } catch (err) {
      console.error('Error confirmando pago:', err);
      await loading.dismiss();
      await this.showError('Error al confirmar el pago');
    }
  }

  private async markPaymentSuccess(paymentId: string, servicioId: string, resp: any) {
    const payRef = doc(this.firestore, 'payments', paymentId);
    await updateDoc(payRef, {
      status: 'approved',
      authorizationCode: resp.authorization_code,
      paymentTypeCode: resp.payment_type_code,
      cardNumber: resp.card_detail?.card_number,
      transactionDate: resp.transaction_date,
      updatedAt: new Date().toISOString()
    });

    const servRef = doc(this.firestore, 'servicios', servicioId);
    await updateDoc(servRef, {
      estado: 'pagado',
      fechaPago: new Date().toISOString(),
      codigoAutorizacion: resp.authorization_code
    });
  }

  private async markPaymentFailed(paymentId: string) {
    const payRef = doc(this.firestore, 'payments', paymentId);
    await updateDoc(payRef, {
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
  }

  private async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Error en el pago',
      message,
      buttons: [{
        text: 'Volver',
        handler: () => this.router.navigate(['/servicios-agendados-cliente'])
      }]
    });
    await alert.present();
  }

}

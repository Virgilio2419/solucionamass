import { Component, OnInit } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { LoadingController, AlertController } from "@ionic/angular"
import { PaymentService } from "src/app/services/payment.service"
import { Firestore, doc, updateDoc } from "@angular/fire/firestore"

@Component({
  selector: "app-return-paypal",
  templateUrl: "./return-paypal.component.html",
  styleUrls: ["./return-paypal.component.scss"],
  standalone: false,
})
export class ReturnPaypalComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private paymentService: PaymentService,
    private firestore: Firestore,
  ) {}

  async ngOnInit() {
    // PayPal devuelve 'token' como el orderId y 'PayerID'
    const token = this.route.snapshot.queryParamMap.get("token") // Este es el orderId
    const payerId = this.route.snapshot.queryParamMap.get("PayerID")

    // También intentamos obtener los parámetros que podríamos haber pasado
    const paymentId = this.route.snapshot.queryParamMap.get("paymentId")
    const servicioId = this.route.snapshot.queryParamMap.get("servicioId")

    console.log("Params recibidos:", { token, payerId, paymentId, servicioId })

    if (!token) {
      return this.showError("Token de PayPal no encontrado.")
    }

    const loading = await this.loadingCtrl.create({ message: "Confirmando pago con PayPal..." })
    await loading.present()

    try {
      // Usar el token como orderId para capturar el pago
      const resp = await this.paymentService.confirmPayment(token)
      console.log("Respuesta confirmPayment:", resp)

      if (resp.status === "COMPLETED") {
        // Si tenemos paymentId y servicioId, actualizamos los registros
        if (paymentId && servicioId) {
          await this.markPaymentSuccess(paymentId, servicioId, resp)
        }

        await loading.dismiss()

        const alert = await this.alertCtrl.create({
          header: "¡Pago exitoso!",
          message: `Pago completado con PayPal. ID de captura: ${resp.captureId}`,
          buttons: [
            {
              text: "Continuar",
              handler: () => this.router.navigate(["/servicios-agendados-cliente"]),
            },
          ],
        })
        await alert.present()
      } else {
        if (paymentId) {
          await this.markPaymentFailed(paymentId)
        }
        await loading.dismiss()
        await this.showError("El pago no pudo ser completado")
      }
    } catch (error) {
      console.error("Error confirmando pago:", error)
      await loading.dismiss()
      await this.showError("Error al confirmar el pago con PayPal")
    }
  }

  private async markPaymentSuccess(paymentId: string, servicioId: string, resp: any) {
    try {
      const payRef = doc(this.firestore, "payments", paymentId)
      await updateDoc(payRef, {
        status: "approved",
        captureId: resp.captureId,
        paypalOrderId: resp.orderId,
        amount: resp.amount,
        createTime: resp.createTime,
        updateTime: resp.updateTime,
        updatedAt: new Date().toISOString(),
      })

      const servRef = doc(this.firestore, "servicios", servicioId)
      await updateDoc(servRef, {
        estado: "pagado",
        fechaPago: new Date().toISOString(),
        captureId: resp.captureId,
      })
    } catch (error) {
      console.error("Error actualizando registros:", error)
    }
  }

  private async markPaymentFailed(paymentId: string) {
    try {
      const payRef = doc(this.firestore, "payments", paymentId)
      await updateDoc(payRef, {
        status: "rejected",
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error marcando pago como fallido:", error)
    }
  }

  private async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: "Error en el pago",
      message,
      buttons: [
        {
          text: "Volver",
          handler: () => this.router.navigate(["/servicios-agendados-cliente"]),
        },
      ],
    })
    await alert.present()
  }
}
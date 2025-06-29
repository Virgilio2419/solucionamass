import { Injectable } from "@angular/core"
import  { ServicioConPrestador } from "./servicio.service"
import {  Firestore, doc, setDoc, getDoc } from "@angular/fire/firestore"
import { environment } from "../../environments/environment"


export interface PaymentData {
  orderId: string
  approveUrl: string
  paymentId: string
  url?: string
}

export interface PayPalOrderResponse {
  id: string
  approveUrl?: string
  status: string
  links?: Array<{ rel: string; href: string; method: string }>
}

export interface PayPalCaptureResponse {
  orderId: string
  status: string
  captureId: string
  amount: {
    currency_code: string
    value: string
  }
  createTime: string
  updateTime: string
}

@Injectable({
  providedIn: "root",
})
export class PaymentService {
  private readonly baseUrl = `${environment.backendUrl}/api/paypal`

  constructor(private firestore: Firestore) {}

  async initPayment(servicio: ServicioConPrestador, clienteUid: string): Promise<PaymentData> {
    const paymentId = this.generatePaymentId()

    // Incluir los parámetros en la URL de retorno
    const returnUrlWithParams = `${environment.paypal.returnUrl}?paymentId=${paymentId}&servicioId=${servicio.id}`

    const transactionData = {
      amount: servicio.montoFinal!,
      currency: "USD",
      returnUrl: returnUrlWithParams,
      cancelUrl: environment.paypal.cancelUrl,
    }

    try {
      console.log("Enviando datos a PayPal:", transactionData)

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error HTTP:", response.status, errorText)
        throw new Error(`Error HTTP: ${response.status} - ${errorText}`)
      }

      const paypalResponse: PayPalOrderResponse = await response.json()
      console.log("Respuesta de PayPal:", paypalResponse)

      // Validar que tenemos todos los campos necesarios
      if (!paypalResponse.id) {
        throw new Error("PayPal no devolvió un id válido")
      }

      // Buscar la URL de aprobación en los links si no viene directamente
      let approveUrl: string | undefined = paypalResponse.approveUrl

      if (!approveUrl && paypalResponse.links) {
        const approveLink = paypalResponse.links.find((link) => link.rel === "approve")
        approveUrl = approveLink?.href
        console.log("URL de aprobación encontrada en links:", approveUrl)
      }

      if (!approveUrl) {
        console.error("Links disponibles:", paypalResponse.links)
        throw new Error("PayPal no devolvió una approveUrl válida")
      }

      // Preparar datos para Firestore (sin campos undefined)
      const firestoreData = {
        servicioId: servicio.id || "",
        clienteUid: clienteUid || "",
        prestadorUid: servicio.prestadorUid || "",
        amount: servicio.montoFinal || 0,
        orderId: paypalResponse.id,
        status: "pending",
        createdAt: new Date().toISOString(),
        approveUrl: approveUrl,
        paypalStatus: paypalResponse.status || "",
      }

      console.log("Guardando en Firestore:", firestoreData)

      // Guardar datos en Firestore
      await this.savePaymentInfo(paymentId, firestoreData)

      return {
        orderId: paypalResponse.id,
        approveUrl: approveUrl,
        paymentId,
      }
    } catch (error) {
      console.error("Error iniciando pago PayPal:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`No se pudo iniciar el pago con PayPal: ${errorMessage}`)
    }
  }

  async confirmPayment(orderId: string): Promise<PayPalCaptureResponse> {
    try {
      console.log("Confirmando pago para orderId:", orderId)

      const response = await fetch(`${this.baseUrl}/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error HTTP en capture:", response.status, errorText)
        throw new Error(`Error HTTP: ${response.status} - ${errorText}`)
      }

      const captureResponse: PayPalCaptureResponse = await response.json()
      console.log("Respuesta de capture:", captureResponse)

      return captureResponse
    } catch (error) {
      console.error("Error confirmando pago PayPal:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`No se pudo confirmar el pago con PayPal: ${errorMessage}`)
    }
  }

  private async savePaymentInfo(paymentId: string, data: any): Promise<void> {
    try {
      const ref = doc(this.firestore, "payments", paymentId)
      await setDoc(ref, data)
      console.log("💾 Pago guardado en Firestore:", paymentId)
    } catch (error) {
      console.error("Error guardando en Firestore:", error)
      throw error
    }
  }

  async getPaymentInfo(paymentId: string): Promise<any> {
    try {
      const snap = await getDoc(doc(this.firestore, "payments", paymentId))
      return snap.exists() ? snap.data() : null
    } catch (error) {
      console.error("Error obteniendo info de pago:", error)
      return null
    }
  }

  private generatePaymentId(): string {
    return `PAY${Date.now()}${Math.random().toString(36).substr(2, 5)}`
  }
}

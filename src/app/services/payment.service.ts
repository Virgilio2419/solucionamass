import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ServicioConPrestador } from './servicio.service';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';

export interface PaymentData {
  orderId: string;
  approveUrl: string;
  paymentId: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly baseUrl = 'http://localhost:3001/api/paypal'; // backend PayPal sandbox
  private readonly frontendUrl = 'https://6250-2803-c600-d30d-ca88-7c2e-bf84-3f76-db8a.ngrok-free.app';

  constructor(
    private http: HttpClient,
    private firestore: Firestore,
  ) {}

  /** Inicia el pago: crea una orden en PayPal y devuelve el link de aprobación */
  async initPayment(servicio: ServicioConPrestador, clienteUid: string): Promise<PaymentData> {
    const paymentId = this.generatePaymentId();

    const transactionData = {
      amount: servicio.montoFinal!,
      currency: 'USD' // o la moneda que uses
    };

    // Crear orden PayPal
    const response = await firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/orders`, transactionData, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' })
      })
    );

    // Extraer URL de aprobación para redirigir usuario
    const approveUrl = response.links?.find((l: any) => l.rel === 'approve')?.href;

    if (!approveUrl) {
      throw new Error('No se pudo obtener URL de aprobación de PayPal');
    }

    // Guardar datos en Firestore
    await this.savePaymentInfo(paymentId, {
      servicioId: servicio.id!,
      clienteUid,
      prestadorUid: servicio.prestadorUid!,
      amount: servicio.montoFinal!,
      orderId: response.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      approveUrl,
      fullResponse: response
    });

    return {
      orderId: response.id,
      approveUrl,
      paymentId
    };
  }

  /** Confirma el pago después que usuario aprueba en PayPal */
  async confirmPayment(orderId: string) {
    return await firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/orders/${orderId}/capture`, {}, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' })
      })
    );
  }

  private async savePaymentInfo(paymentId: string, data: any): Promise<void> {
    const ref = doc(this.firestore, 'payments', paymentId);
    await setDoc(ref, data);
    console.log('💾 Pago guardado en Firestore:', paymentId);
  }

  async getPaymentInfo(paymentId: string): Promise<any> {
    const snap = await getDoc(doc(this.firestore, 'payments', paymentId));
    return snap.exists() ? snap.data() : null;
  }

  private generatePaymentId(): string {
    return `PAY${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
  }
}

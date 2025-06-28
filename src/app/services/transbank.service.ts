import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TransbankTransaction {
  buy_order: string;
  session_id: string;
  amount: number;
  return_url: string;
}

export interface TransbankResponse {
  token: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransbankService {
  private readonly baseUrl = 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions';
  
  // Credenciales de prueba de Transbank
  private readonly commerceCode = '597055555532';
  private readonly apiKey = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

  constructor(private http: HttpClient) {}

  /**
   * Crear transacción en Transbank
   */
  createTransaction(transaction: TransbankTransaction): Observable<TransbankResponse> {
    const headers = new HttpHeaders({
      'Tbk-Api-Key-Id': this.commerceCode,
      'Tbk-Api-Key-Secret': this.apiKey,
      'Content-Type': 'application/json'
    });

    return this.http.post<TransbankResponse>(this.baseUrl, transaction, { headers });
  }

  /**
   * Confirmar transacción
   */
  confirmTransaction(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Tbk-Api-Key-Id': this.commerceCode,
      'Tbk-Api-Key-Secret': this.apiKey,
      'Content-Type': 'application/json'
    });

    return this.http.put(`${this.baseUrl}/${token}`, {}, { headers });
  }

  /**
   * Generar orden de compra única
   */
  generateBuyOrder(): string {
    return `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generar ID de sesión único
   */
  generateSessionId(): string {
    return `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
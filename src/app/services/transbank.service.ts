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

export interface TransbankConfirmResponse {
  vci: string;
  amount: number;
  status: string;
  buy_order: string;
  session_id: string;
  card_detail: {
    card_number: string;
  };
  accounting_date: string;
  transaction_date: string;
  authorization_code: string;
  payment_type_code: string;
  response_code: number;
  installments_amount?: number;
  installments_number?: number;
  balance?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransbankService {
  // Usar proxy local para desarrollo
  private readonly baseUrl = '/api/transbank/transactions';
  
  // Credenciales de prueba de Transbank
  private readonly commerceCode = '597055555532';
  private readonly apiKey = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

  constructor(private http: HttpClient) {}

  createTransaction(transaction: TransbankTransaction): Observable<TransbankResponse> {
    const headers = new HttpHeaders({
      'Tbk-Api-Key-Id': this.commerceCode,
      'Tbk-Api-Key-Secret': this.apiKey,
      'Content-Type': 'application/json'
    });

    return this.http.post<TransbankResponse>(this.baseUrl, transaction, { headers });
  }

  confirmTransaction(token: string): Observable<TransbankConfirmResponse> {
    const headers = new HttpHeaders({
      'Tbk-Api-Key-Id': this.commerceCode,
      'Tbk-Api-Key-Secret': this.apiKey,
      'Content-Type': 'application/json'
    });

    return this.http.put<TransbankConfirmResponse>(`${this.baseUrl}/${token}`, {}, { headers });
  }

  generateBuyOrder(): string {
    return `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId(): string {
    return `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
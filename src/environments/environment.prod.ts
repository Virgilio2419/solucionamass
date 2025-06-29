export const environment = {
  firebaseConfig: {
    apiKey: "AIzaSyA6LsTCMldohJF1fkujWibxw_ScJEZ8t_I",
    authDomain: "solucionamass.firebaseapp.com",
    projectId: "solucionamass",
    storageBucket: "solucionamass.firebasestorage.app",
    messagingSenderId: "645602678964",
    appId: "1:645602678964:web:04785ed4cd8ffb62bc5fe1",
    measurementId: "G-TX7F3YCLNY",
  },
  transbank: {
    commerceCode: "TU_COMMERCE_CODE_PRODUCCION",
    apiKey: "TU_API_KEY_PRODUCCION",
    environment: "production",
    returnUrl: "https://tu-dominio.com/return-transbank",
    finalUrl: "https://tu-dominio.com/final-transbank",
  },
  paypal: {
    clientId: "TU_PAYPAL_CLIENT_ID_PRODUCCION",
    clientSecret: "TU_PAYPAL_CLIENT_SECRET_PRODUCCION",
    environment: "live",
    returnUrl: "https://tu-dominio.com/return-paypal",
    cancelUrl: "https://tu-dominio.com/payment-cancel",
  },
  transbankBackendUrl: "https://tu-backend-url.com/api/transbank/transactions",
  backendUrl: "https://tu-backend-url.com",
  production: true,
}

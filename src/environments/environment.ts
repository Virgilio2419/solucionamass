// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  firebaseConfig : {
  apiKey: "AIzaSyA6LsTCMldohJF1fkujWibxw_ScJEZ8t_I",
  authDomain: "solucionamass.firebaseapp.com",
  projectId: "solucionamass",
  storageBucket: "solucionamass.firebasestorage.app",
  messagingSenderId: "645602678964",
  appId: "1:645602678964:web:04785ed4cd8ffb62bc5fe1",
  measurementId: "G-TX7F3YCLNY"
},
  transbank: {
    // Para desarrollo (sandbox)
    commerceCode: '597055555532',
    apiKey: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
    environment: 'integration', // 'integration' para pruebas, 'production' para producción
    returnUrl: 'http://localhost:8100/return-transbank',
    finalUrl: 'http://localhost:8100/final-transbank'
  },
  production: false
};



/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

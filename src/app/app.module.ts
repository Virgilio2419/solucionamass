import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { CreateUserComponent } from './components/create-user/create-user.component';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { PrestadoresPage } from './components/prestadores/prestadores.component';
import { ServiciosAgendadosClienteComponent } from './components/servicios-agendados-cliente/servicios-agendados-cliente.component';
import { CommonModule } from '@angular/common';
import { MainComponent } from './components/main/main.component';
import { SolicitudesServicioComponent } from './components/solicitudes-servicio/solicitudes-servicio.component';
import { histSolicitudesServicioComponent } from './components/hist-solicitudes-servicio/hist-solicitudes-servicio.component';
import { HistServiciosAgendadosClienteComponent } from './components/hist-servicios-agendados-cliente/hist-servicios-agendados-cliente.component';
import { FlatpickrModule } from 'angularx-flatpickr';
import { provideFlatpickrDefaults } from 'angularx-flatpickr';
import { ProfileComponent } from './components/profile/profile.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { RecoverPasswordComponent } from './components/recover-password/recover-password.component';
import { ReturnTransbankComponent } from './components/return-transbank/return-transbank.component';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    RegisterComponent,
    LoginComponent,
    MainComponent,
    CreateUserComponent,
    PrestadoresPage,
    ServiciosAgendadosClienteComponent,
    SolicitudesServicioComponent,
    histSolicitudesServicioComponent,
    HistServiciosAgendadosClienteComponent,
    ProfileComponent,
    ForgotPasswordComponent,
    RecoverPasswordComponent,
    ReturnTransbankComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    FlatpickrModule,
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideHttpClient(withInterceptorsFromDi()),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'solucionamass',
        appId: '1:645602678964:web:e3b0758e60d9f093bc5fe1',
        storageBucket: 'solucionamass.firebasestorage.app',
        apiKey: 'AIzaSyA6LsTCMldohJF1fkujWibxw_ScJEZ8t_I',
        authDomain: 'solucionamass.firebaseapp.com',
        messagingSenderId: '645602678964',
        measurementId: 'G-7P9NG6LY8E',
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideFlatpickrDefaults({
      altInput: true,
      convertModelValue: true,
      inline: true,
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
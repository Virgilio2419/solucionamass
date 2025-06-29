import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
// Importa tus componentes creados
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { MainComponent } from './components/main/main.component';
import { CreateUserComponent } from './components/create-user/create-user.component';
import { PrestadoresPage } from './components/prestadores/prestadores.component';
import { canActivate, redirectUnauthorizedTo } from '@angular/fire/auth-guard';
import { ServiciosAgendadosClienteComponent } from './components/servicios-agendados-cliente/servicios-agendados-cliente.component';
import { SolicitudesServicioComponent } from './components/solicitudes-servicio/solicitudes-servicio.component';
import { histSolicitudesServicioComponent } from './components/hist-solicitudes-servicio/hist-solicitudes-servicio.component';
import { HistServiciosAgendadosClienteComponent } from './components/hist-servicios-agendados-cliente/hist-servicios-agendados-cliente.component';
import { ProfileComponent } from './components/profile/profile.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { RecoverPasswordComponent } from './components/recover-password/recover-password.component';
import { ReturnTransbankComponent } from './components/return-transbank/return-transbank.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'recover-password', component: RecoverPasswordComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'main', component: MainComponent, ...canActivate(() => redirectUnauthorizedTo(['/login'])) },
  { path: 'create-user', component: CreateUserComponent, ...canActivate(() => redirectUnauthorizedTo(['/login'])) },
  { path: 'prestadores', component: PrestadoresPage, ...canActivate(() => redirectUnauthorizedTo(['/login'])) },
  { path: 'servicios-agendados-cliente', component: ServiciosAgendadosClienteComponent, ...canActivate(() => redirectUnauthorizedTo(['/login'])) },
  { path: 'solicitudes-servicio', component: SolicitudesServicioComponent, ...canActivate(() => redirectUnauthorizedTo(['/login'])) },
  { path: 'hist-solicitudes-servicio', component: histSolicitudesServicioComponent, ...canActivate(() => redirectUnauthorizedTo(['/login'])) },
  { path: 'hist-servicios-agendados-cliente', component: HistServiciosAgendadosClienteComponent, ...canActivate(() => redirectUnauthorizedTo(['/login'])) },
  { path: 'profile', component: ProfileComponent, ...canActivate(() => redirectUnauthorizedTo(['/login'])) },
  { path: 'return-transbank', component: ReturnTransbankComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
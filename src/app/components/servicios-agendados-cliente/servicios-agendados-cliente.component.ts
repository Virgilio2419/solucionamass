import { Component, OnInit, OnDestroy } from '@angular/core';
import { ServicioService, ServicioConPrestador } from 'src/app/services/servicio.service';
import { PaymentService } from 'src/app/services/payment.service';
import { Auth, user } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { Firestore, doc, updateDoc, collection, addDoc } from '@angular/fire/firestore';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-servicios-agendados-cliente',
  templateUrl: './servicios-agendados-cliente.component.html',
  styleUrls: ['./servicios-agendados-cliente.component.scss'],
  standalone: false,
})
export class ServiciosAgendadosClienteComponent implements OnInit, OnDestroy {
  servicios: ServicioConPrestador[] = [];
  serviciosFiltrados: ServicioConPrestador[] = [];
  uidCliente: string | null = null;
  authSub?: Subscription;
  filtro: string = '';
  nombreCliente: string = '';

  constructor(
    private servicioService: ServicioService,
    private paymentService: PaymentService,
    private auth: Auth,
    private firestore: Firestore,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.authSub = user(this.auth).subscribe(async u => {
      if (u?.uid) {
        this.uidCliente = u.uid;
        this.nombreCliente = u.displayName || 'Cliente';
        await this.cargarServicios();
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  async cargarServicios() {
    if (!this.uidCliente) return;

    const todos = await this.servicioService.getServiciosByClienteConPrestador(this.uidCliente);

    this.servicios = todos.filter(
      s => !['cancelado', 'completo', 'pagado'].includes(this.normalizarEstado(s.estado))
    );

    this.serviciosFiltrados = [...this.servicios];
  }

  normalizarEstado(estado: string | undefined): string {
    return (estado || '').trim().toLowerCase();
  }

  esEstado(servicio: ServicioConPrestador, estado: string): boolean {
    return this.normalizarEstado(servicio.estado) === estado.toLowerCase();
  }

  filtrarServicios() {
    const filtroLower = this.filtro.trim().toLowerCase();

    this.serviciosFiltrados = this.servicios.filter(s => {
      const nombreCompleto = `${s.prestadorDatos?.nombres ?? ''} ${s.prestadorDatos?.apellidos ?? ''}`.toLowerCase();
      const estado = this.normalizarEstado(s.estado);
      const fecha = s.fechaAgendamiento?.toLowerCase?.() ?? '';

      return (
        nombreCompleto.includes(filtroLower) ||
        estado.includes(filtroLower) ||
        fecha.includes(filtroLower)
      );
    });
  }

  async cancelarServicio(servicioId: string | undefined) {
    if (!servicioId) return;

    const alert = await this.alertController.create({
      header: '¿Cancelar servicio?',
      message: '¿Estás seguro de que deseas cancelar este servicio?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          handler: async () => {
            try {
              const ref = doc(this.firestore, 'servicios', servicioId);
              await updateDoc(ref, { estado: 'cancelado' });
              await this.cargarServicios();
            } catch (error) {
              console.error('Error al cancelar servicio:', error);
              window.alert('Error al cancelar el servicio. Intenta nuevamente.');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async aceptarReagendamiento(servicioId: string | undefined) {
    if (!servicioId) return;

    const alert = await this.alertController.create({
      header: '¿Aceptar nueva fecha?',
      message: '¿Deseas confirmar la nueva fecha del servicio?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, aceptar',
          handler: async () => {
            try {
              const ref = doc(this.firestore, 'servicios', servicioId);
              await updateDoc(ref, { estado: 'en proceso' });
              await this.cargarServicios();
            } catch (error) {
              console.error('Error al aceptar nueva fecha:', error);
              window.alert('Ocurrió un error al aceptar el reagendamiento. Intenta nuevamente.');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async rechazarReagendamiento(servicioId: string | undefined) {
    if (!servicioId) return;

    const alert = await this.alertController.create({
      header: '¿Rechazar nueva fecha?',
      message: '¿Estás seguro de que deseas rechazar esta nueva fecha de servicio?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, rechazar',
          handler: async () => {
            try {
              const ref = doc(this.firestore, 'servicios', servicioId);
              await updateDoc(ref, { estado: 'reagendar' });
              await this.cargarServicios();
            } catch (error) {
              console.error('Error al rechazar el reagendamiento:', error);
              window.alert('Error al rechazar la nueva fecha. Intenta nuevamente.');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async finalizarServicio(servicio: ServicioConPrestador) {
    const estadoActual = this.normalizarEstado(servicio.estado);
    const ref = doc(this.firestore, 'servicios', servicio.id!);

    if (estadoActual === 'en proceso') {
      await updateDoc(ref, { estado: 'completado cliente' });
      alert('🔄 Servicio marcado como completado por el cliente.');

      await this.solicitarCalificacion(
        servicio.prestadorUid!,
        'prestador',
        `${servicio.prestadorDatos?.nombres ?? 'Prestador'} ${servicio.prestadorDatos?.apellidos ?? ''}`,
        servicio.id
      );

    } else if (estadoActual === 'completado prestador') {
      await updateDoc(ref, { estado: 'completo' });

      await this.solicitarCalificacion(
        servicio.prestadorUid!,
        'prestador',
        `${servicio.prestadorDatos?.nombres ?? 'Prestador'} ${servicio.prestadorDatos?.apellidos ?? ''}`,
        servicio.id
      );

      alert('✅ Servicio finalizado y prestador calificado.');
    } else {
      alert('⚠️ El servicio no está en un estado finalizable por el cliente.');
    }

    await this.cargarServicios();
  }

  async solicitarCalificacion(
    calificadoUid: string,
    tipo: 'cliente' | 'prestador',
    nombre: string,
    idReferencia?: string
  ): Promise<boolean> {
    if (!calificadoUid || !this.uidCliente) {
      const toast = await this.toastController.create({
        message: 'No se pudo identificar al usuario para la calificación.',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return false;
    }

    return new Promise(async (resolve) => {
      const alerta = await this.alertController.create({
        header: `Califica a ${nombre}`,
        inputs: [
          {
            name: 'puntuacion',
            type: 'number',
            min: 1,
            max: 5,
            placeholder: 'Puntuación (1 a 5)',
            attributes: { min: 1, max: 5, step: 1 },
          },
          {
            name: 'comentario',
            type: 'text',
            placeholder: 'Comentario (máx 50 caracteres)',
            attributes: { maxlength: 50 }
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Enviar',
            handler: async (data) => {
              const puntuacion = Number(data?.puntuacion);
              const comentario = data?.comentario?.trim() || '';

              if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
                const toast = await this.toastController.create({
                  message: 'La puntuación debe ser un número entero entre 1 y 5.',
                  duration: 3000,
                  color: 'warning'
                });
                await toast.present();
                resolve(false);
                return false;
              }

              const calificacion = {
                calificadoUid,
                calificadorUid: this.uidCliente,
                tipo,
                puntuacion,
                comentario,
                fecha: new Date().toISOString(),
                idReferencia
              };

              try {
                await addDoc(collection(this.firestore, 'calificaciones'), calificacion);
                const toast = await this.toastController.create({
                  message: '✅ Calificación enviada exitosamente',
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
                resolve(true);
              } catch (error) {
                console.error('Error al guardar la calificación:', error);
                const toast = await this.toastController.create({
                  message: '❌ Error al enviar la calificación',
                  duration: 3000,
                  color: 'danger'
                });
                await toast.present();
                resolve(false);
              }

              return true;
            }
          }
        ]
      });

      await alerta.present();
    });
  }

  async pagarServicio(servicio: ServicioConPrestador) {
    // Validar que el servicio tenga monto final
    if (!servicio.montoFinal || servicio.montoFinal <= 0) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Este servicio no tiene un monto final definido. Contacta al prestador.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Paso 1: Solicitar calificación primero
    const calificacionExitosa = await this.solicitarCalificacion(
      servicio.prestadorUid!,
      'prestador',
      `${servicio.prestadorDatos?.nombres ?? 'Prestador'} ${servicio.prestadorDatos?.apellidos ?? ''}`,
      servicio.id
    );

    // Si el usuario canceló o falló la calificación, no continuar con el pago
    if (!calificacionExitosa) return;

    // Paso 2: Confirmar el pago
    const alertaPago = await this.alertController.create({
      header: 'Confirmar pago',
      message: `¿Deseas pagar el monto final de $${servicio.montoFinal.toLocaleString('es-CL')} por este servicio?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Pagar con PayPal',
          handler: async () => {
            await this.procesarPagoPayPal(servicio);
          }
        }
      ]
    });

    await alertaPago.present();
  }

  private async procesarPagoPayPal(servicio: ServicioConPrestador) {
    const loading = await this.loadingController.create({
      message: 'Iniciando pago con PayPal...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      console.log('Iniciando pago para servicio:', servicio.id);

      // Solicita creación de orden PayPal y obtén url de aprobación
      const paymentData = await this.paymentService.initPayment(servicio, this.uidCliente!);
      console.log('Payment data recibido:', paymentData);
      await loading.dismiss();

      // Abrir ventana popup con la URL de aprobación PayPal
      const paypalWindow = window.open(
        paymentData.url, // asumiendo que aquí está la URL de aprobación PayPal
        'paypal_payment',
        'width=800,height=600,scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no'
      );

      if (!paypalWindow) {
        await this.alertController.create({
          header: 'Bloqueador de ventanas',
          message: 'Por favor, permite las ventanas emergentes para proceder con el pago.',
          buttons: ['OK']
        }).then(alert => alert.present());
        return;
      }

      // Mostrar alerta con instrucciones
      const instructionAlert = await this.alertController.create({
        header: 'Pago en proceso',
        message: 'Se ha abierto una ventana para procesar tu pago con PayPal. Una vez completado, cierra la ventana para continuar.',
        buttons: [
          {
            text: 'Entendido',
            handler: () => {
              // Vigilar cierre de ventana para luego confirmar el pago
              const checkClosed = setInterval(async () => {
                if (paypalWindow.closed) {
                  clearInterval(checkClosed);
                  // Confirmar pago capturando la orden PayPal
                  await this.confirmarPagoPayPal(paymentData.orderId, servicio.id!);
                }
              }, 1000);

              // Timeout por seguridad (10 minutos)
              setTimeout(() => {
                if (!paypalWindow.closed) {
                  clearInterval(checkClosed);
                  paypalWindow.close();
                  this.confirmarPagoPayPal(paymentData.orderId, servicio.id!);
                }
              }, 600000);
            }
          }
        ]
      });
      await instructionAlert.present();

    } catch (error) {
      await loading.dismiss();
      console.error('Error al procesar pago:', error);
      const alert = await this.alertController.create({
        header: 'Error de pago',
        message: `No se pudo iniciar el proceso de pago: ${error}`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  private async confirmarPagoPayPal(orderId: string, servicioId: string) {
    const loading = await this.loadingController.create({
      message: 'Confirmando pago en PayPal...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const captureResponse = await this.paymentService.confirmPayment(orderId);
      await loading.dismiss();

      if (captureResponse.status === 'COMPLETED') {
        // Actualizar estado del servicio como pagado en Firestore
        const ref = doc(this.firestore, 'servicios', servicioId);
        await updateDoc(ref, { estado: 'pagado' });

        const toast = await this.toastController.create({
          message: 'Pago realizado correctamente.',
          duration: 3000,
          color: 'success'
        });
        await toast.present();

        // Recargar lista
        await this.cargarServicios();

      } else {
        // Pago no completado
        await this.mostrarErrorPago('El pago no se completó correctamente.');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('Error confirmando pago:', error);
      await this.mostrarErrorPago('Ocurrió un error al confirmar el pago.');
    }
  }

  private async mostrarErrorPago(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Error de pago',
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ServicioService, ServicioConPrestador } from 'src/app/services/servicio.service';
import { TransbankService, TransbankTransaction } from 'src/app/services/transbank.service';
import { Auth, user } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { Firestore, doc, updateDoc, collection, addDoc } from '@angular/fire/firestore';
import { AlertController, LoadingController } from '@ionic/angular';

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
  uidPrestador: any;
  nombreCliente: string = '';

  constructor(
    private servicioService: ServicioService,
    private transbankService: TransbankService,
    private auth: Auth,
    private firestore: Firestore,
    private alertController: AlertController,
    private loadingController: LoadingController
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
      alert('No se pudo identificar al usuario que califica o al que será calificado.');
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
                alert('La puntuación debe ser un número entero entre 1 y 5.');
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
                alert('✅ Calificación enviada');
                resolve(true);
              } catch (error) {
                console.error('Error al guardar la calificación:', error);
                alert('❌ Error al enviar la calificación');
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
    // Paso 1: Solicitar calificación primero
    const calificacionExitosa = await this.solicitarCalificacion(
      servicio.prestadorUid!,
      'prestador',
      `${servicio.prestadorDatos?.nombres ?? 'Prestador'} ${servicio.prestadorDatos?.apellidos ?? ''}`,
      servicio.id
    );

    if (!calificacionExitosa) return;

    // Paso 2: Confirmar el pago
    const alertaPago = await this.alertController.create({
      header: 'Confirmar pago',
      message: `¿Deseas pagar el monto final de $${servicio.montoFinal ?? '0'} por este servicio?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Pagar con Transbank',
          handler: async () => {
            await this.procesarPagoTransbank(servicio);
          }
        }
      ]
    });

    await alertaPago.present();
  }

  private async procesarPagoTransbank(servicio: ServicioConPrestador) {
    const loading = await this.loadingController.create({
      message: 'Iniciando pago con Transbank...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Crear datos de la transacción
      const buyOrder = this.transbankService.generateBuyOrder();
      const sessionId = this.transbankService.generateSessionId();
      const amount = servicio.montoFinal || 0;

      // Guardar información del pago en Firestore
      const paymentData = {
        servicioId: servicio.id,
        clienteUid: this.uidCliente,
        prestadorUid: servicio.prestadorUid,
        amount,
        buyOrder,
        sessionId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const paymentRef = await addDoc(collection(this.firestore, 'payments'), paymentData);

      // Crear transacción en Transbank
      const transaction: TransbankTransaction = {
        buy_order: buyOrder,
        session_id: sessionId,
        amount,
        return_url: `${window.location.origin}/return-transbank?paymentId=${paymentRef.id}&servicioId=${servicio.id}`
      };

      // Llamar a Transbank
      this.transbankService.createTransaction(transaction).subscribe({
        next: async (response) => {
          await loading.dismiss();
          
          // Actualizar el registro con el token
          await updateDoc(paymentRef, {
            token: response.token,
            updatedAt: new Date().toISOString()
          });

          // Mostrar instrucciones y abrir Transbank
          const alert = await this.alertController.create({
            header: 'Redirigiendo a Transbank',
            message: 'Se abrirá una nueva ventana para completar tu pago. Una vez completado, regresa a esta aplicación para verificar el estado.',
            buttons: [
              {
                text: 'Abrir Transbank',
                handler: () => {
                  const paymentUrl = `${response.url}?token_ws=${response.token}`;
                  window.open(paymentUrl, '_blank');
                  
                  // Mostrar botón para verificar pago después de un tiempo
                  setTimeout(() => {
                    this.mostrarVerificacionPago(servicio);
                  }, 10000); // 10 segundos
                }
              }
            ]
          });
          await alert.present();
        },
        error: async (error) => {
          await loading.dismiss();
          console.error('Error al crear transacción:', error);
          
          const alert = await this.alertController.create({
            header: 'Error',
            message: 'No se pudo iniciar el proceso de pago. Verifica tu conexión e intenta nuevamente.',
            buttons: ['OK']
          });
          await alert.present();
        }
      });

    } catch (error) {
      await loading.dismiss();
      console.error('Error al procesar pago:', error);
      
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Ocurrió un error al procesar el pago. Intenta nuevamente.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  private async mostrarVerificacionPago(servicio: ServicioConPrestador) {
    const alert = await this.alertController.create({
      header: '¿Completaste el pago?',
      message: 'Si ya completaste el pago en Transbank, presiona "Verificar" para actualizar el estado del servicio.',
      buttons: [
        {
          text: 'Aún no',
          role: 'cancel'
        },
        {
          text: 'Verificar',
          handler: async () => {
            await this.verificarEstadoPago(servicio);
          }
        }
      ]
    });
    await alert.present();
  }

  private async verificarEstadoPago(servicio: ServicioConPrestador) {
    const loading = await this.loadingController.create({
      message: 'Verificando estado del pago...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.cargarServicios();
      await loading.dismiss();

      const servicioActualizado = this.servicios.find(s => s.id === servicio.id);
      
      if (servicioActualizado && this.esEstado(servicioActualizado, 'pagado')) {
        const alert = await this.alertController.create({
          header: '¡Pago confirmado!',
          message: 'Tu pago ha sido procesado exitosamente.',
          buttons: ['OK']
        });
        await alert.present();
      } else {
        const alert = await this.alertController.create({
          header: 'Pago pendiente',
          message: 'El pago aún no se ha confirmado. Si ya pagaste, espera unos minutos y verifica nuevamente.',
          buttons: [
            { text: 'OK', role: 'cancel' },
            {
              text: 'Verificar de nuevo',
              handler: () => {
                setTimeout(() => {
                  this.verificarEstadoPago(servicio);
                }, 5000);
              }
            }
          ]
        });
        await alert.present();
      }

    } catch (error) {
      await loading.dismiss();
      console.error('Error al verificar pago:', error);
      
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se pudo verificar el estado del pago. Intenta nuevamente.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}
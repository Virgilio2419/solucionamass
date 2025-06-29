const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 3001;

// Para poder recibir JSON en el body
app.use(express.json());

// CORS: permite tu frontend y ngrok
app.use(cors({
  origin: [
    'http://localhost:8100',
    'http://localhost:8101',
    'http://localhost:4200',
    'https://6250-2803-c600-d30d-ca88-7c2e-bf84-3f76-db8a.ngrok-free.app'
  ],
  credentials: true,
}));

// Logging básico
app.use((req, res, next) => {
  console.log(`\n=== ${new Date().toISOString()} ===`);
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Credenciales PayPal Sandbox
const PAYPAL_CLIENT_ID = 'Acoy4bZR9EtRfE8TjMsnLBhpgET3FUmy1ou_eV5riX1wVhSLzStfW2PZvpipg2kAhwBdRvr9S2L0p7VU';
const PAYPAL_SECRET = 'EOTlu8SRk7l5epdYohwBZD1ucfKoFcgEVALVRlTUHgIBbE-oK3w-yZdhv5cImhkrPSTjXSVGR0yAlJcE';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

// Función para obtener token de acceso PayPal
async function getPayPalAccessToken() {
  const response = await axios({
    url: `${PAYPAL_API}/v1/oauth2/token`,
    method: 'post',
    auth: {
      username: PAYPAL_CLIENT_ID,
      password: PAYPAL_SECRET,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: 'grant_type=client_credentials',
  });
  return response.data.access_token;
}

// Crear orden de pago en PayPal
app.post('/api/paypal/orders', async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount debe ser mayor que 0' });
    }

    const accessToken = await getPayPalAccessToken();

    const orderResponse = await axios({
      url: `${PAYPAL_API}/v2/checkout/orders`,
      method: 'post',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toFixed(2)
          }
        }],
        application_context: {
          return_url: 'https://tu-frontend.com/paypal-return', // Cambia esta URL a tu frontend real
          cancel_url: 'https://tu-frontend.com/paypal-cancel'
        }
      }
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Error creando orden PayPal:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error creando orden PayPal' });
  }
});

// Capturar pago después de que el usuario aprueba la orden en PayPal
app.post('/api/paypal/orders/:orderId/capture', async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ error: 'orderId requerido' });

    const accessToken = await getPayPalAccessToken();

    const captureResponse = await axios({
      url: `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      method: 'post',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    res.json(captureResponse.data);
  } catch (error) {
    console.error('Error capturando pago PayPal:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error capturando pago PayPal' });
  }
});

// Ruta healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), port: PORT });
});

// Rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor PayPal Sandbox iniciado en http://localhost:${PORT}`);
});

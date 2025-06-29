// Cargar variables de entorno ANTES de cualquier otra cosa
require("dotenv").config()

const express = require("express")
const cors = require("cors")
const paypal = require("@paypal/checkout-server-sdk")

const app = express()

app.use(cors())
app.use(express.json())

// Debug: Verificar que las variables de entorno se carguen
console.log("=== VERIFICACIÓN DE CREDENCIALES ===")
console.log(
  "PAYPAL_CLIENT_ID:",
  process.env.PAYPAL_CLIENT_ID ? `${process.env.PAYPAL_CLIENT_ID.substring(0, 10)}...` : "❌ NO ENCONTRADO",
)
console.log(
  "PAYPAL_CLIENT_SECRET:",
  process.env.PAYPAL_CLIENT_SECRET ? `${process.env.PAYPAL_CLIENT_SECRET.substring(0, 10)}...` : "❌ NO ENCONTRADO",
)
console.log("=====================================")

// Verificar que las credenciales existan
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  console.error("❌ ERROR: Las credenciales de PayPal no están configuradas correctamente")
  console.error("Asegúrate de que el archivo .env existe y contiene:")
  console.error("PAYPAL_CLIENT_ID=tu_client_id")
  console.error("PAYPAL_CLIENT_SECRET=tu_client_secret")
  process.exit(1)
}

// Configura PayPal environment sandbox
const environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)

const client = new paypal.core.PayPalHttpClient(environment)

// Crear orden PayPal
app.post("/api/paypal/orders", async (req, res) => {
  const { amount, currency, returnUrl, cancelUrl } = req.body

  console.log("📝 Datos recibidos:", { amount, currency, returnUrl, cancelUrl })

  if (!amount || !currency) {
    return res.status(400).json({ error: "Amount and currency are required" })
  }

  // Usar las URLs enviadas desde el frontend o usar las por defecto
  const finalReturnUrl = returnUrl || "http://localhost:8100/return-paypal"
  const finalCancelUrl = cancelUrl || "http://localhost:8100/payment-cancel"

  console.log("🔗 URLs configuradas:", { finalReturnUrl, finalCancelUrl })

  const request = new paypal.orders.OrdersCreateRequest()
  request.prefer("return=representation")
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "SolucionaMass",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: finalReturnUrl,
      cancel_url: finalCancelUrl,
    },
  })

  try {
    console.log("🚀 Enviando request a PayPal...")
    const order = await client.execute(request)
    console.log("✅ PayPal Order Response:", JSON.stringify(order.result, null, 2))

    // Buscar el link de aprobación
    const approveLink = order.result.links?.find((link) => link.rel === "approve")

    if (!approveLink) {
      console.error("❌ No approve link found in PayPal response")
      console.error("Available links:", order.result.links)
      return res.status(500).json({ error: "No approve link found in PayPal response" })
    }

    if (!order.result.id) {
      console.error("❌ No order ID found in PayPal response")
      return res.status(500).json({ error: "No order ID found in PayPal response" })
    }

    const response = {
      id: order.result.id,
      approveUrl: approveLink.href,
      status: order.result.status,
      links: order.result.links,
    }

    console.log("📤 Sending response:", response)
    res.json(response)
  } catch (error) {
    console.error("❌ Error creating PayPal order:", error)
    console.error("Error details:", error.details || [])
    res.status(500).json({
      error: error.message || "Error creating PayPal order",
      details: error.details || [],
    })
  }
})

// Capturar pago PayPal
app.post("/api/paypal/orders/:orderId/capture", async (req, res) => {
  const { orderId } = req.params

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" })
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderId)
  request.requestBody({})

  try {
    const capture = await client.execute(request)
    console.log("PayPal Capture Response:", JSON.stringify(capture.result, null, 2))

    if (!capture.result.purchase_units?.[0]?.payments?.captures?.[0]) {
      return res.status(500).json({ error: "No capture information found" })
    }

    const captureInfo = capture.result.purchase_units[0].payments.captures[0]

    const response = {
      orderId: capture.result.id,
      status: capture.result.status,
      captureId: captureInfo.id,
      amount: captureInfo.amount,
      createTime: capture.result.create_time,
      updateTime: capture.result.update_time,
    }

    console.log("Sending capture response:", response)
    res.json(response)
  } catch (error) {
    console.error("Error capturing PayPal payment:", error)
    res.status(500).json({
      error: error.message || "Error capturing PayPal payment",
      details: error.details || [],
    })
  }
})

app.listen(3001, () => {
  console.log("🚀 Servidor PayPal Sandbox iniciado en http://localhost:3001")
  console.log("✅ Credenciales de PayPal cargadas correctamente")
})

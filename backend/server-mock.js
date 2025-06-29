const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const mockTransactions = {};

// POST inicia transacción
app.post('/api/transbank', (req, res) => {
  const { buy_order, session_id, amount, return_url } = req.body;

  const token = `mockToken_${Date.now()}`;
  mockTransactions[token] = {
    buy_order,
    session_id,
    amount,
    return_url,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  res.json({
    token,
    url: `${return_url}&token_ws=${token}`
  });
});

// PUT confirma transacción
app.put('/api/transbank/transactions/:token', (req, res) => {
  const { token } = req.params;

  if (!mockTransactions[token]) {
    return res.status(404).json({ error: 'Transacción no encontrada' });
  }

  mockTransactions[token].status = 'approved';
  mockTransactions[token].confirmed_at = new Date().toISOString();

  res.json({
    response_code: 0,
    authorization_code: 'MOCK123456',
    payment_type_code: 'VN',
    card_detail: { card_number: 'XXXX-XXXX-XXXX-1234' },
    transaction_date: new Date().toISOString(),
    token,
    buy_order: mockTransactions[token].buy_order,
    session_id: mockTransactions[token].session_id,
    amount: mockTransactions[token].amount
  });
});

app.listen(port, () => {
  console.log(`Mock Transbank backend escuchando en http://localhost:${port}`);
});

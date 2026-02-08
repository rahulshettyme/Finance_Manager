const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Password for authentication
const APP_PASSWORD = 'Shrira@1234';

// Data file path
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'finance_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    transactions: [],
    incomeSources: [],
    expenseCategories: [],
    expenseItems: []
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'finance-manager-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Helper functions
function readData() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ==================== Routes ====================

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (password === APP_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.json({ success: false, error: 'Incorrect password' });
  }
});

// Logout endpoint
app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
app.get('/api/check-auth', (req, res) => {
  res.json({ authenticated: req.session && req.session.authenticated });
});

// Get all data
app.get('/api/data', requireAuth, (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (error) {
    console.error('Error in /api/data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Add transaction
app.post('/api/transactions', requireAuth, (req, res) => {
  try {
    const data = readData();
    const transaction = {
      id: Date.now(),
      ...req.body,
      timestamp: new Date().toISOString()
    };

    data.transactions.push(transaction);

    // Update dropdown lists
    if (transaction.type === 'income') {
      if (transaction.category && !data.incomeSources.includes(transaction.category)) {
        data.incomeSources.push(transaction.category);
      }
    } else if (transaction.type === 'expense') {
      if (transaction.category && !data.expenseCategories.includes(transaction.category)) {
        data.expenseCategories.push(transaction.category);
      }
      if (transaction.item && !data.expenseItems.includes(transaction.item)) {
        data.expenseItems.push(transaction.item);
      }
    }

    writeData(data);
    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Error in POST /api/transactions:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Update transaction
app.put('/api/transactions/:id', requireAuth, (req, res) => {
  try {
    const data = readData();
    const id = parseInt(req.params.id);
    const updatedTransaction = req.body;

    const index = data.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      // Keep original ID and timestamp if not provided
      data.transactions[index] = {
        ...data.transactions[index],
        ...updatedTransaction,
        id: id // Ensure ID doesn't change
      };

      // Update dropdown lists if new values introduced
      const transaction = data.transactions[index];
      if (transaction.type === 'income') {
        if (transaction.category && !data.incomeSources.includes(transaction.category)) {
          data.incomeSources.push(transaction.category);
        }
      } else if (transaction.type === 'expense') {
        if (transaction.category && !data.expenseCategories.includes(transaction.category)) {
          data.expenseCategories.push(transaction.category);
        }
        if (transaction.item && !data.expenseItems.includes(transaction.item)) {
          data.expenseItems.push(transaction.item);
        }
      }

      writeData(data);
      res.json({ success: true, transaction: data.transactions[index] });
    } else {
      res.status(404).json({ error: 'Transaction not found' });
    }
  } catch (error) {
    console.error('Error in PUT /api/transactions:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  try {
    const data = readData();
    const id = parseInt(req.params.id);
    data.transactions = data.transactions.filter(t => t.id !== id);
    writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Static files - serve login page for root
app.get('/', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  } else {
    res.sendFile(path.join(__dirname, 'login.html'));
  }
});

// Protected dashboard route
app.get('/dashboard.html', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  } else {
    res.redirect('/');
  }
});

// Serve static files
app.use(express.static(__dirname));

// Start server
app.listen(PORT, () => {
  console.log(`Finance Manager running on http://localhost:${PORT}`);
  console.log(`Password: ${APP_PASSWORD}`);
});

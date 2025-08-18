import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/database.js';
import ratesRouter from './routes/rates.js';
import bankProvidersRouter from './routes/bankProviders.js';
import bankAccountsRouter from './routes/bankAccounts.js';
import cardsRouter from './routes/cards.js';
import binLookupRouter from './routes/binLookup.js';
import transactionsRouter from './routes/transactions.js';
import topupsRouter from './routes/topups.js';
import configRouter from './routes/config.js';
import multiStepRouter from './routes/multiStepTransactions.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

// Register routes
app.use('/api', ratesRouter);
app.use('/api', bankProvidersRouter);
app.use('/api', bankAccountsRouter);
app.use('/api', cardsRouter);
app.use('/api', binLookupRouter);
app.use('/api', transactionsRouter);
app.use('/api', topupsRouter);
app.use('/api', configRouter);
app.use('/api', multiStepRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}`);
});



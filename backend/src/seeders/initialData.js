import BankProvider from '../models/BankProvider.js';
import BankAccount from '../models/BankAccount.js';
import Card from '../models/Card.js';

export const seedInitialData = async () => {
  try {
    console.log('🌱 Seeding initial data...');
    
    // Check if data already exists
    const existingProviders = await BankProvider.countDocuments();
    if (existingProviders > 0) {
      console.log('✅ Data already exists, skipping seeding');
      return;
    }
    
    // Create Wise Provider
    const wiseProvider = new BankProvider({
      name: 'Wise',
      code: 'WISE',
      description: 'International money transfer service',
      isActive: true,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'IDR', 'AUD', 'SGD'],
      metadata: new Map([
        ['website', 'https://wise.com'],
        ['type', 'international_transfer'],
        ['manual_process', 'true']
      ])
    });
    
    await wiseProvider.save();
    console.log('✅ Wise provider created');
    
    // Create Sample Bank Account with multi-currency wallets
    const sampleAccount = new BankAccount({
      name: 'Wise Multi-Currency Account',
      provider: wiseProvider._id,
      accountNumber: 'WISE001',
      wallets: [
        { currency: 'USD', balance: 1000.00, isActive: true, openedAt: new Date() },
        { currency: 'EUR', balance: 850.00, isActive: true, openedAt: new Date() },
        { currency: 'GBP', balance: 750.00, isActive: true, openedAt: new Date() }
      ],
      isActive: true,
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'US',
        postalCode: '10001'
      }
    });
    
    await sampleAccount.save();
    console.log('✅ Sample USD account created');
    
    // Create Sample Card
    const sampleCard = new Card({
      cardNumber: '4111111111111111',
      cardName: 'John Doe',
      expiredDate: new Date('2025-12-31'),
      cvv: '123',
      bankAccount: sampleAccount._id,
      status: 'active',
      useAccountAddress: true,
      address: sampleAccount.address
    });
    
    await sampleCard.save();
    console.log('✅ Sample card created');
    
    console.log('🎉 Initial data seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
  }
};

export default seedInitialData;

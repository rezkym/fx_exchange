import express from 'express';
import TopUp from '../models/TopUp.js';
import Transaction from '../models/Transaction.js';
import BankAccount from '../models/BankAccount.js';
import Card from '../models/Card.js';
import AuditTrail from '../models/AuditTrail.js';

const router = express.Router();

// POST create multi-step transaction (IDR → Wise → Target Provider)
router.post('/multi-step-transactions', async (req, res) => {
  try {
    const {
      sourceAmount,
      sourceCurrency = 'IDR',
      intermediateProvider, // Wise
      targetProvider, // Aspire, etc.
      targetCurrency,
      sourceCard,
      description
    } = req.body;
    
    // Validation
    if (!sourceAmount || !intermediateProvider || !targetProvider || !targetCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Source amount, intermediate provider, target provider, and target currency are required'
      });
    }
    
    // Get exchange rates
    const idrToTargetRate = await getExchangeRate(sourceCurrency, targetCurrency);
    const estimatedFinalAmount = sourceAmount * idrToTargetRate;
    
    // Find intermediate account (Wise)
    const intermediateAccount = await BankAccount.findOne({
      provider: intermediateProvider,
      currency: targetCurrency,
      isActive: true
    }).populate('provider');
    
    if (!intermediateAccount) {
      return res.status(400).json({
        success: false,
        message: `No active ${targetCurrency} account found for intermediate provider`
      });
    }
    
    // Find target account
    const targetAccount = await BankAccount.findOne({
      provider: targetProvider,
      currency: targetCurrency,
      isActive: true
    }).populate('provider');
    
    if (!targetAccount) {
      return res.status(400).json({
        success: false,
        message: `No active ${targetCurrency} account found for target provider`
      });
    }
    
    // Validate source card if provided
    let card = null;
    if (sourceCard) {
      card = await Card.findById(sourceCard);
      if (!card || card.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Source card not found or not active'
        });
      }
    }
    
    // Create multi-step TopUp
    const multiStepTopUp = new TopUp({
      bankAccount: targetAccount._id,
      amount: estimatedFinalAmount,
      currency: targetCurrency,
      topUpMethod: 'multi_step_routing',
      sourceDetails: {
        routeSteps: [
          {
            stepNumber: 1,
            fromProvider: 'External_IDR',
            toProvider: intermediateAccount.provider.name,
            fromCurrency: sourceCurrency,
            toCurrency: targetCurrency,
            amount: sourceAmount,
            convertedAmount: estimatedFinalAmount,
            exchangeRate: idrToTargetRate,
            stepStatus: 'pending'
          },
          {
            stepNumber: 2,
            fromProvider: intermediateAccount.provider.name,
            toProvider: targetAccount.provider.name,
            fromCurrency: targetCurrency,
            toCurrency: targetCurrency,
            amount: estimatedFinalAmount,
            convertedAmount: estimatedFinalAmount,
            exchangeRate: 1,
            stepStatus: 'pending'
          }
        ],
        intermediateAccountId: intermediateAccount._id,
        targetAccountId: targetAccount._id,
        sourceCardId: sourceCard
      },
      description: description || `Multi-step: ${sourceCurrency} → ${intermediateAccount.provider.name} → ${targetAccount.provider.name}`,
      status: 'pending'
    });
    
    const savedTopUp = await multiStepTopUp.save();
    
    // Log audit trail
    await AuditTrail.logTopUpEvent(
      savedTopUp._id,
      'topup_created',
      'create_multistep_transaction',
      null,
      {
        ipAddress: req.ip,
        method: 'POST',
        endpoint: '/api/multi-step-transactions',
        steps: savedTopUp.sourceDetails.routeSteps.length
      }
    );
    
    const populatedTopUp = await TopUp.findById(savedTopUp._id)
      .populate('bankAccount', 'name accountNumber currency provider');
    
    res.status(201).json({
      success: true,
      message: 'Multi-step transaction created successfully',
      data: {
        transaction: populatedTopUp,
        steps: [
          {
            step: 1,
            action: 'Top up to intermediate provider (manual)',
            provider: intermediateAccount.provider.name,
            amount: sourceAmount,
            currency: sourceCurrency,
            status: 'pending'
          },
          {
            step: 2,
            action: 'Transfer to target provider (API)',
            provider: targetAccount.provider.name,
            amount: estimatedFinalAmount,
            currency: targetCurrency,
            status: 'pending'
          }
        ],
        instructions: [
          `Step 1: Manually top up ${sourceAmount} ${sourceCurrency} to ${intermediateAccount.provider.name}`,
          `Step 2: System will automatically transfer ${estimatedFinalAmount} ${targetCurrency} to ${targetAccount.provider.name}`,
          `Use transaction ID: ${savedTopUp.topUpId} for reference`
        ]
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating multi-step transaction',
      error: error.message
    });
  }
});

// PUT execute next step in multi-step transaction
router.put('/multi-step-transactions/:id/execute-step', async (req, res) => {
  try {
    const { stepNumber, actualAmount, actualFee, notes } = req.body;
    
    const topUp = await TopUp.findById(req.params.id)
      .populate('bankAccount');
    
    if (!topUp || topUp.topUpMethod !== 'multi_step_routing') {
      return res.status(404).json({
        success: false,
        message: 'Multi-step transaction not found'
      });
    }
    
    // Find the step to execute
    const stepIndex = topUp.sourceDetails.routeSteps.findIndex(s => s.stepNumber === stepNumber);
    if (stepIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Step not found'
      });
    }
    
    const step = topUp.sourceDetails.routeSteps[stepIndex];
    
    if (step.stepStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Step is not in pending status'
      });
    }
    
    // Update step status
    step.stepStatus = 'processing';
    step.actualAmount = actualAmount || step.amount;
    step.actualFee = actualFee || 0;
    step.notes = notes;
    
    await topUp.save();
    
    try {
      if (stepNumber === 1) {
        // Step 1: Manual top up to intermediate provider
        // User confirms they've done the top up
        step.stepStatus = 'completed';
        step.completedAt = new Date();
        
        // Update intermediate account balance
        await BankAccount.findByIdAndUpdate(
          topUp.sourceDetails.intermediateAccountId,
          { $inc: { balance: actualAmount || step.convertedAmount } }
        );
        
      } else if (stepNumber === 2) {
        // Step 2: Auto transfer from intermediate to target
        const intermediateAccount = await BankAccount.findById(topUp.sourceDetails.intermediateAccountId);
        const targetAccount = await BankAccount.findById(topUp.sourceDetails.targetAccountId);
        
        if (intermediateAccount.balance < step.amount) {
          throw new Error('Insufficient balance in intermediate account');
        }
        
        // Create internal transfer transaction
        const transferTransaction = new Transaction({
          fromAccount: intermediateAccount._id,
          toAccount: targetAccount._id,
          amount: step.amount,
          fromCurrency: step.fromCurrency,
          toCurrency: step.toCurrency,
          exchangeRate: step.exchangeRate,
          convertedAmount: step.convertedAmount,
          fee: actualFee || 0,
          totalAmount: step.amount + (actualFee || 0),
          description: `Multi-step transfer: Step ${stepNumber}`,
          metadata: new Map([
            ['multiStepTopUpId', topUp._id.toString()],
            ['stepNumber', stepNumber.toString()]
          ])
        });
        
        await transferTransaction.save();
        
        // Update balances
        await BankAccount.findByIdAndUpdate(
          intermediateAccount._id,
          { $inc: { balance: -step.amount } }
        );
        
        await BankAccount.findByIdAndUpdate(
          targetAccount._id,
          { $inc: { balance: step.convertedAmount } }
        );
        
        step.stepStatus = 'completed';
        step.completedAt = new Date();
        step.transactionId = transferTransaction._id;
      }
      
      // Check if all steps are completed
      const allStepsCompleted = topUp.sourceDetails.routeSteps.every(s => s.stepStatus === 'completed');
      if (allStepsCompleted) {
        topUp.status = 'completed';
        topUp.completedAt = new Date();
      }
      
      await topUp.save();
      
      // Log audit trail
      await AuditTrail.logTopUpEvent(
        topUp._id,
        allStepsCompleted ? 'topup_completed' : 'topup_updated',
        `execute_step_${stepNumber}`,
        [{ field: `step${stepNumber}.status`, oldValue: 'pending', newValue: step.stepStatus }],
        {
          ipAddress: req.ip,
          method: 'PUT',
          endpoint: `/api/multi-step-transactions/${req.params.id}/execute-step`
        }
      );
      
      res.json({
        success: true,
        message: `Step ${stepNumber} executed successfully`,
        data: {
          stepStatus: step.stepStatus,
          transactionStatus: topUp.status,
          nextStep: allStepsCompleted ? null : stepNumber + 1,
          completedSteps: topUp.sourceDetails.routeSteps.filter(s => s.stepStatus === 'completed').length,
          totalSteps: topUp.sourceDetails.routeSteps.length
        }
      });
      
    } catch (stepError) {
      // Rollback step status on error
      step.stepStatus = 'failed';
      step.failureReason = stepError.message;
      await topUp.save();
      
      await AuditTrail.logError(
        topUp._id,
        'TopUp',
        stepError,
        { step: stepNumber, action: 'execute_step' }
      );
      
      throw stepError;
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error executing step',
      error: error.message
    });
  }
});

// GET multi-step transaction status
router.get('/multi-step-transactions/:id/status', async (req, res) => {
  try {
    const topUp = await TopUp.findById(req.params.id)
      .populate('bankAccount', 'name accountNumber currency provider');
    
    if (!topUp || topUp.topUpMethod !== 'multi_step_routing') {
      return res.status(404).json({
        success: false,
        message: 'Multi-step transaction not found'
      });
    }
    
    const steps = topUp.sourceDetails.routeSteps.map(step => ({
      stepNumber: step.stepNumber,
      description: `${step.fromProvider} → ${step.toProvider}`,
      amount: step.amount,
      currency: step.fromCurrency,
      convertedAmount: step.convertedAmount,
      targetCurrency: step.toCurrency,
      status: step.stepStatus,
      completedAt: step.completedAt,
      failureReason: step.failureReason,
      canExecute: step.stepStatus === 'pending'
    }));
    
    const currentStep = steps.find(s => s.status === 'pending');
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    
    res.json({
      success: true,
      data: {
        transactionId: topUp.topUpId,
        overallStatus: topUp.status,
        currentStep: currentStep?.stepNumber || null,
        progress: {
          completed: completedSteps,
          total: steps.length,
          percentage: (completedSteps / steps.length) * 100
        },
        steps,
        canRollback: completedSteps > 0 && topUp.status !== 'completed',
        estimatedCompletion: topUp.status === 'completed' ? topUp.completedAt : null
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction status',
      error: error.message
    });
  }
});

// POST rollback multi-step transaction
router.post('/multi-step-transactions/:id/rollback', async (req, res) => {
  try {
    const { reason, fromStep } = req.body;
    
    const topUp = await TopUp.findById(req.params.id);
    
    if (!topUp || topUp.topUpMethod !== 'multi_step_routing') {
      return res.status(404).json({
        success: false,
        message: 'Multi-step transaction not found'
      });
    }
    
    if (topUp.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot rollback completed transaction'
      });
    }
    
    // Rollback steps in reverse order
    const rollbackSteps = [];
    
    for (let i = topUp.sourceDetails.routeSteps.length - 1; i >= (fromStep - 1); i--) {
      const step = topUp.sourceDetails.routeSteps[i];
      
      if (step.stepStatus === 'completed') {
        try {
          if (step.stepNumber === 2 && step.transactionId) {
            // Rollback internal transfer
            const transaction = await Transaction.findById(step.transactionId);
            if (transaction) {
              // Reverse the balance changes
              await BankAccount.findByIdAndUpdate(
                transaction.fromAccount,
                { $inc: { balance: step.amount } }
              );
              
              await BankAccount.findByIdAndUpdate(
                transaction.toAccount,
                { $inc: { balance: -step.convertedAmount } }
              );
              
              transaction.status = 'cancelled';
              await transaction.save();
            }
          }
          
          step.stepStatus = 'cancelled';
          step.rollbackReason = reason;
          step.rolledBackAt = new Date();
          
          rollbackSteps.push({
            step: step.stepNumber,
            action: 'rolled back',
            reason
          });
          
        } catch (rollbackError) {
          rollbackSteps.push({
            step: step.stepNumber,
            action: 'rollback failed',
            error: rollbackError.message
          });
        }
      }
    }
    
    topUp.status = 'failed';
    topUp.failureReason = `Rollback: ${reason}`;
    topUp.failedAt = new Date();
    
    await topUp.save();
    
    // Log audit trail
    await AuditTrail.logTopUpEvent(
      topUp._id,
      'topup_failed',
      'rollback_multistep_transaction',
      [{ field: 'status', oldValue: 'processing', newValue: 'failed' }],
      {
        ipAddress: req.ip,
        method: 'POST',
        endpoint: `/api/multi-step-transactions/${req.params.id}/rollback`,
        rollbackReason: reason
      }
    );
    
    res.json({
      success: true,
      message: 'Multi-step transaction rolled back successfully',
      data: {
        rollbackSteps,
        finalStatus: topUp.status,
        rollbackReason: reason
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rolling back transaction',
      error: error.message
    });
  }
});

// Helper function to get exchange rate
async function getExchangeRate(fromCurrency, toCurrency) {
  try {
    if (fromCurrency === toCurrency) return 1;
    
    const response = await fetch(`http://localhost:4000/api/rates/live?source=${fromCurrency}&target=${toCurrency}`);
    const data = await response.json();
    return data.value || 1;
  } catch (error) {
    console.log('Exchange rate fetch failed:', error.message);
    return 1; // Fallback rate
  }
}

export default router;


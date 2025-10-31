const banks = {
  paris: [
    {
      id: 'bnp_paris',
      name: 'BNP Paribas',
      location: 'paris',
      services: ['loan', 'deposit', 'withdraw'],
      loanConditions: {
        maxAmount: 50000,
        interestRate: 0.05,
        requiredCreditScore: 600,
      },
    },
  ],
  new_york: [
    {
      id: 'chase_ny',
      name: 'Chase Bank',
      location: 'new_york',
      services: ['loan', 'deposit', 'withdraw'],
      loanConditions: {
        maxAmount: 100000,
        interestRate: 0.07,
        requiredCreditScore: 650,
      },
    },
  ],
};

class BankManager {
  getBanks(location) {
    return banks[location] || [];
  }

  applyForLoan(player, bankId, amount) {
    const bank = Object.values(banks)
      .flat()
      .find((b) => b.id === bankId);

    if (!bank) {
      return { success: false, message: 'Banque non trouvée.' };
    }

    if (player.stats.creditScore < bank.loanConditions.requiredCreditScore) {
      return { success: false, message: `Votre score de crédit de ${player.stats.creditScore} est insuffisant. Le minimum requis est de ${bank.loanConditions.requiredCreditScore}.` };
    }

    if (amount > bank.loanConditions.maxAmount) {
      return { success: false, message: `Le montant maximum du prêt est de ${bank.loanConditions.maxAmount}$.` };
    }

    player.inventory.bankAccount += amount;
    if (!player.inventory.loans) {
      player.inventory.loans = [];
    }
    player.inventory.loans.push({
      bankId,
      amount,
      interestRate: bank.loanConditions.interestRate,
      date: Date.now(),
    });

    return { success: true, message: `Félicitations, votre prêt de ${amount}$ a été approuvé.` };
  }
}

export default new BankManager();
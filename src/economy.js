
class EconomyManager {
  constructor() {
    this.jobs = {
      'livreur': {
        name: 'Livreur',
        salary: 1200,
        requirements: { driving: true },
        skillGains: { driving: 2 }
      },
      'serveur': {
        name: 'Serveur',
        salary: 1000,
        requirements: {},
        skillGains: { negotiation: 1 }
      },
      'mecano': {
        name: 'Mécanicien',
        salary: 1800,
        requirements: { repair: 20 },
        skillGains: { repair: 3 }
      },
      'taxi': {
        name: 'Chauffeur Taxi',
        salary: 1500,
        requirements: { driving: true },
        skillGains: { driving: 3, negotiation: 1 }
      },
      'cuisinier': {
        name: 'Cuisinier',
        salary: 1400,
        requirements: { cooking: 15 },
        skillGains: { cooking: 3 }
      },
      'vendeur': {
        name: 'Vendeur',
        salary: 1300,
        requirements: {},
        skillGains: { negotiation: 2 }
      },
      'gardien': {
        name: 'Gardien de Sécurité',
        salary: 1600,
        requirements: { combat: 10 },
        skillGains: { combat: 2 }
      },
      'dealer': {
        name: 'Dealer (Illégal)',
        salary: 3000,
        requirements: { stealth: 30 },
        skillGains: { stealth: 3, negotiation: 2 },
        illegal: true
      },
      'braqueur': {
        name: 'Braqueur (Illégal)',
        salary: 5000,
        requirements: { combat: 40, stealth: 30 },
        skillGains: { combat: 4, stealth: 3 },
        illegal: true
      }
    };

    this.vehicles = {
      'velo': {
        name: 'Vélo',
        price: 200,
        speed: 1,
        fuel: false,
        requiresLicense: false
      },
      'scooter': {
        name: 'Scooter',
        price: 1500,
        speed: 2,
        fuelConsumption: 5,
        requiresLicense: true
      },
      'voiture': {
        name: 'Voiture Basique',
        price: 8000,
        speed: 3,
        fuelConsumption: 10,
        requiresLicense: true
      },
      'voiture_sport': {
        name: 'Voiture de Sport',
        price: 25000,
        speed: 5,
        fuelConsumption: 20,
        requiresLicense: true
      },
      'camion': {
        name: 'Camion',
        price: 15000,
        speed: 2,
        fuelConsumption: 25,
        requiresLicense: true
      },
      'moto': {
        name: 'Moto',
        price: 5000,
        speed: 4,
        fuelConsumption: 8,
        requiresLicense: true
      }
    };

    this.licenses = {
      'driving': {
        name: 'Permis de Conduire',
        cost: 500,
        requirements: { age: 18, lessons: 0 }
      },
      'gun': {
        name: 'Permis de Port d\'Arme',
        cost: 1000,
        requirements: { wanted: 0, clean_record: true }
      },
      'business': {
        name: 'Licence Commerciale',
        cost: 2000,
        requirements: { money: 5000 }
      }
    };

    this.items = {
      'phone': {
        name: 'Téléphone',
        price: 350,
        description: 'Un smartphone basique pour rester connecté.'
      },
      'bouteille_eau': { name: 'Bouteille d\'eau', price: 1, type: 'drink', effects: { hunger: 0, energy: 5 } },
      'sandwich': { name: 'Sandwich', price: 5, type: 'food', effects: { hunger: 25 } },
      'pizza': { name: 'Pizza', price: 12, type: 'food', effects: { hunger: 50 } },
      'canette_soda': { name: 'Canette de Soda', price: 2, type: 'drink', effects: { hunger: 5, energy: 10 } },
      'cafe': { name: 'Café', price: 3, type: 'drink', effects: { energy: 15 } },
      'barre_chocolat': { name: 'Barre de chocolat', price: 2, type: 'food', effects: { hunger: 10, energy: 5 } },
      'plat_prepare': { name: 'Plat préparé', price: 8, type: 'food', effects: { hunger: 40 } },
      'pain': { name: 'Pain', price: 1, type: 'food', effects: { hunger: 15 } },
      'pommes': { name: 'Pommes (kg)', price: 3, type: 'food', effects: { hunger: 10 } }
    };

    this.shops = {
      'electronics': {
        name: 'Boutique d\'Électronique',
        inventory: ['phone'],
        location: 'centre-ville'
      },
      'supermarche': {
        name: 'Supermarché',
        inventory: ['bouteille_eau', 'sandwich', 'pizza', 'canette_soda', 'cafe', 'barre_chocolat', 'plat_prepare', 'pain', 'pommes'],
        location: 'marais'
      }
    };
  }

  getJobsList() {
    return Object.entries(this.jobs).map(([id, job]) => ({
      id,
      ...job
    }));
  }

  getVehiclesList() {
    return Object.entries(this.vehicles).map(([id, vehicle]) => ({
      id,
      ...vehicle
    }));
  }

  canApplyForJob(player, jobId) {
    const job = this.jobs[jobId];
    if (!job) return { can: false, reason: 'Job non trouvé' };

    if (job.requirements.driving && !player.licenses.driving) {
      return { can: false, reason: 'Permis de conduire requis' };
    }

    for (const [skill, minLevel] of Object.entries(job.requirements)) {
      if (skill !== 'driving' && (player.skills[skill] || 0) < minLevel) {
        return { can: false, reason: `Compétence ${skill} niveau ${minLevel} requis` };
      }
    }

    return { can: true };
  }

  getLicenseInfo(licenseType) {
    return this.licenses[licenseType];
  }

  getVehicleInfo(vehicleId) {
    return this.vehicles[vehicleId];
  }

  getItemInfo(itemId) {
    return this.items[itemId];
  }

  getShopsForItem(itemId) {
    const sellingShops = [];
    for (const shopId in this.shops) {
      if (this.shops[shopId].inventory.includes(itemId)) {
        sellingShops.push(this.shops[shopId]);
      }
    }
    return sellingShops;
  }
}

export default new EconomyManager();

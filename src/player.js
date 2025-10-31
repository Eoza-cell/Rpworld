import database from './database.js';

class PlayerManager {
  createNewPlayer(phoneNumber, name = "Inconnu") {
    return {
      phoneNumber,
      name,
      customName: null,
      age: null,
      gender: null,
      background: null,
      characterCreated: false,
      stats: {
        health: 100,
        energy: 100,
        hunger: 100,
        mental: 100,
        wanted: 0,
        creditScore: 500
      },
      family: {
        pregnant: false,
        pregnancyStart: null,
        children: []
      },
      position: {
        location: "paris",
        x: 0,
        y: 0
      },
      inventory: {
        money: 500,
        bankAccount: 0,
        items: [],
        vehicles: []
      },
      job: {
        current: null,
        experience: {},
        salary: 0,
        workHours: 0,
        atWork: false,
        lastWorkCheck: null
      },
      licenses: {
        driving: false,
        gun: false,
        business: false
      },
      skills: {
        driving: 0,
        negotiation: 0,
        combat: 0,
        stealth: 0,
        cooking: 0,
        repair: 0
      },
      history: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    };
  }

  async createCharacter(player, name, age, background) {
    player.customName = name;
    player.age = age;
    player.background = background;
    player.characterCreated = true;
    
    // Bonus selon le background
    const backgroundBonuses = {
      'athletique': { stats: { health: 10, energy: 10 }, skills: { combat: 10 } },
      'intellectuel': { stats: { mental: 15 }, skills: { negotiation: 15 } },
      'streetwise': { stats: { wanted: -10 }, skills: { stealth: 15 } },
      'riche': { inventory: { money: 2000, bankAccount: 5000 } },
      'mecano': { skills: { repair: 20, driving: 10 } }
    };
    
    const bonus = backgroundBonuses[background];
    if (bonus) {
      if (bonus.stats) Object.assign(player.stats, { ...player.stats, ...bonus.stats });
      if (bonus.skills) Object.assign(player.skills, { ...player.skills, ...bonus.skills });
      if (bonus.inventory) {
        player.inventory.money += bonus.inventory.money || 0;
        player.inventory.bankAccount += bonus.inventory.bankAccount || 0;
      }
    }
    
    return player;
  }

  async getOrCreatePlayer(phoneNumber, name) {
    let player = await database.getPlayer(phoneNumber);
    if (!player) {
      player = this.createNewPlayer(phoneNumber, name);
      await database.savePlayer(phoneNumber, player);
    } else {
      player.lastActive = Date.now();
      await database.savePlayer(phoneNumber, player);
    }
    return player;
  }

  updateStats(player, changes) {
    for (const [stat, change] of Object.entries(changes)) {
      if (player.stats[stat] !== undefined) {
        player.stats[stat] = Math.max(0, Math.min(100, player.stats[stat] + change));
      }
    }
    return player;
  }

  updatePosition(player, newLocation, deltaX = 0, deltaY = 0) {
    if (newLocation) {
      player.position.location = newLocation;
    }
    player.position.x += deltaX;
    player.position.y += deltaY;
    return player;
  }

  addToInventory(player, item, quantity = 1) {
    const existing = player.inventory.items.find(i => i.name === item);
    if (existing) {
      existing.quantity += quantity;
    } else {
      player.inventory.items.push({ name: item, quantity });
    }
    return player;
  }

  addMoney(player, amount) {
    player.inventory.money += amount;
    return player;
  }

  addToHistory(player, action, consequence) {
    player.history.push({
      timestamp: Date.now(),
      action,
      consequence
    });
    if (player.history.length > 50) {
      player.history.shift();
    }
    return player;
  }

  getStatsBar(value) {
    const filled = Math.floor(value / 10);
    const empty = 10 - filled;
    return '▰'.repeat(filled) + '▱'.repeat(empty);
  }

  getStatsDisplay(player) {
    const s = player.stats;
    return `📊 **Stats**
❤️ Santé: ${this.getStatsBar(s.health)} ${s.health}%
⚡ Énergie: ${this.getStatsBar(s.energy)} ${s.energy}%
🍔 Faim: ${this.getStatsBar(s.hunger)} ${s.hunger}%
🧠 Mental: ${this.getStatsBar(s.mental)} ${s.mental}%
🚨 Wanted: ${this.getStatsBar(s.wanted)} ${s.wanted}%
💰 Argent: ${player.inventory.money}$ | 🏦 Banque: ${player.inventory.bankAccount}$
💼 Métier: ${player.job.current || 'Sans emploi'} ${player.job.current ? `(${player.job.workHours}h)` : ''}`;
  }

  addSkillXP(player, skill, amount) {
    if (!player.skills[skill]) player.skills[skill] = 0;
    player.skills[skill] = Math.min(100, player.skills[skill] + amount);
    return player;
  }

  setJob(player, jobName, salary) {
    player.job.current = jobName;
    player.job.salary = salary;
    player.job.workHours = 0;
    if (!player.job.experience[jobName]) {
      player.job.experience[jobName] = 0;
    }
    return player;
  }

  addWorkHours(player, hours) {
    if (player.job.current) {
      player.job.workHours += hours;
      player.job.experience[player.job.current] = 
        (player.job.experience[player.job.current] || 0) + hours;
      
      const earnings = Math.floor((player.job.salary / 40) * hours);
      this.addMoney(player, earnings);
      
      return { player, earnings };
    }
    return { player, earnings: 0 };
  }

  grantLicense(player, licenseType, cost) {
    if (player.inventory.money >= cost) {
      player.licenses[licenseType] = true;
      this.addMoney(player, -cost);
      return { success: true, player };
    }
    return { success: false, player };
  }

  buyVehicle(player, vehicle) {
    if (player.inventory.money >= vehicle.price) {
      if (!player.licenses.driving) {
        return { success: false, reason: 'no_license', player };
      }
      this.addMoney(player, -vehicle.price);
      player.inventory.vehicles.push({
        ...vehicle,
        fuel: 100,
        condition: 100,
        purchaseDate: Date.now()
      });
      return { success: true, player };
    }
    return { success: false, reason: 'insufficient_funds', player };
  }

  depositMoney(player, amount) {
    if (player.inventory.money >= amount) {
      player.inventory.money -= amount;
      player.inventory.bankAccount += amount;
      return { success: true, player };
    }
    return { success: false, player };
  }

  withdrawMoney(player, amount) {
    if (player.inventory.bankAccount >= amount) {
      player.inventory.bankAccount -= amount;
      player.inventory.money += amount;
      return { success: true, player };
    }
    return { success: false, player };
  }

  isAlive(player) {
    return player.stats.health > 0;
  }

  needsRest(player) {
    return player.stats.energy < 20 || player.stats.mental < 30;
  }

  isHungry(player) {
    return player.stats.hunger < 30;
  }

  validateAction(action, player) {
    const lowerAction = action.toLowerCase();
    
    // Vérifier les actions physiquement impossibles
    if (lowerAction.includes('sauter') && (lowerAction.includes('10m') || lowerAction.includes('10 m'))) {
      return { valid: false, reason: "❌ Action impossible: Un humain ne peut pas sauter 10m de haut !" };
    }

    if (lowerAction.includes('voler') && !lowerAction.includes('voleur')) {
      return { valid: false, reason: "❌ Action impossible: Les humains ne peuvent pas voler !" };
    }

    if (lowerAction.includes('chute') && lowerAction.includes('survivre')) {
      const heightMatch = action.match(/(\d+)\s*m/);
      if (heightMatch && parseInt(heightMatch[1]) > 15) {
        return { valid: false, reason: "❌ Une chute de plus de 15m est mortelle pour un humain !" };
      }
    }

    return { valid: true };
  }
}

export default new PlayerManager();

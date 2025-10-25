import database from './database.js';

class PlayerManager {
  createNewPlayer(phoneNumber, name = "Inconnu") {
    return {
      phoneNumber,
      name,
      stats: {
        health: 100,
        energy: 100,
        hunger: 100,
        mental: 100,
        wanted: 0
      },
      position: {
        location: "quartier_beton",
        x: 0,
        y: 0
      },
      inventory: {
        money: 500,
        items: []
      },
      history: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    };
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

  getStatsDisplay(player) {
    const s = player.stats;
    return `📊 **Stats**
❤️ Santé: ${s.health}%
⚡ Énergie: ${s.energy}%
🍔 Faim: ${s.hunger}%
🧠 Mental: ${s.mental}%
🚨 Wanted: ${s.wanted}%
💰 Argent: ${player.inventory.money}$`;
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
}

export default new PlayerManager();

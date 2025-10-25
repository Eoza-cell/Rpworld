import world from './world.js';

class ConsequenceCalculator {
  async calculate(action, player, location) {
    const consequences = {
      statChanges: {},
      positionChange: null,
      inventoryChange: null,
      wantedChange: 0,
      events: [],
      description: ''
    };

    const actionType = action.type || action.detectedType;
    const risk = parseInt(action.risk) || 30;
    const intensity = action.intensity || 'modérée';

    switch (actionType) {
      case 'deplacement':
        consequences.statChanges.energy = this.calculateEnergyLoss(intensity);
        consequences.statChanges.hunger = -2;
        if (action.originalText) {
          const targetLoc = this.extractLocationFromText(action.originalText);
          if (targetLoc) {
            consequences.positionChange = targetLoc;
          }
        }
        break;

      case 'vol':
        consequences.statChanges.mental = -10;
        consequences.statChanges.energy = -15;
        consequences.wantedChange = 20 + (risk / 2);
        
        const success = Math.random() > (risk / 100);
        if (success) {
          consequences.inventoryChange = {
            money: Math.floor(Math.random() * 500) + 100
          };
          consequences.events.push('vol_reussi');
        } else {
          consequences.statChanges.health = -20;
          consequences.wantedChange += 30;
          consequences.events.push('vol_echoue');
        }
        break;

      case 'combat':
        consequences.statChanges.energy = -25;
        consequences.statChanges.mental = -15;
        
        const winFight = Math.random() > 0.5;
        if (winFight) {
          consequences.statChanges.health = -10;
          consequences.events.push('combat_victoire');
        } else {
          consequences.statChanges.health = -35;
          consequences.wantedChange = 15;
          consequences.events.push('combat_defaite');
        }
        break;

      case 'interaction':
        consequences.statChanges.energy = -5;
        consequences.statChanges.mental = 5;
        consequences.events.push('interaction_sociale');
        break;

      case 'commerce':
        consequences.statChanges.energy = -3;
        consequences.events.push('transaction');
        break;

      case 'repos':
        if (action.originalText?.toLowerCase().includes('manger')) {
          consequences.statChanges.hunger = 40;
          consequences.statChanges.energy = 10;
          consequences.inventoryChange = { money: -15 };
        } else if (action.originalText?.toLowerCase().includes('dormir')) {
          consequences.statChanges.energy = 50;
          consequences.statChanges.health = 15;
          consequences.statChanges.mental = 30;
        } else {
          consequences.statChanges.energy = 20;
          consequences.statChanges.mental = 10;
        }
        break;

      default:
        consequences.statChanges.energy = -5;
        consequences.statChanges.hunger = -1;
    }

    if (location && location.police > 70 && player.stats.wanted > 50) {
      if (Math.random() < 0.3) {
        consequences.events.push('police_interpellation');
        consequences.statChanges.health = -10;
      }
    }

    const time = await world.getCurrentTime();
    if (time.period === 'nuit' && actionType === 'deplacement') {
      consequences.statChanges.mental = (consequences.statChanges.mental || 0) - 5;
      if (location?.danger > 60) {
        consequences.events.push('danger_nocturne');
      }
    }

    return consequences;
  }

  calculateEnergyLoss(intensity) {
    const losses = {
      'faible': -3,
      'modérée': -8,
      'élevée': -15,
      'extrême': -25
    };
    return losses[intensity] || -8;
  }

  extractLocationFromText(text) {
    const locations = {
      'quartier béton': 'quartier_beton',
      'beton': 'quartier_beton',
      'quartier riche': 'quartier_riche',
      'riche': 'quartier_riche',
      'zone industrielle': 'zone_industrielle',
      'industrielle': 'zone_industrielle',
      'centre': 'centre_ville',
      'marché': 'marche',
      'marche': 'marche'
    };

    const lowerText = text.toLowerCase();
    for (const [pattern, locationId] of Object.entries(locations)) {
      if (lowerText.includes(pattern)) {
        return locationId;
      }
    }
    return null;
  }
}

export default new ConsequenceCalculator();

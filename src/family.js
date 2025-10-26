
import database from './database.js';

class FamilyManager {
  async canGetPregnant(player) {
    if (player.gender === 'male') return { can: false, reason: 'Biologie incompatible' };
    if (player.age < 18 || player.age > 45) return { can: false, reason: 'Âge inapproprié' };
    if (player.family?.pregnant) return { can: false, reason: 'Déjà enceinte' };
    return { can: true };
  }

  async startPregnancy(player) {
    if (!player.family) {
      player.family = {
        pregnant: false,
        pregnancyStart: null,
        children: []
      };
    }

    player.family.pregnant = true;
    player.family.pregnancyStart = Date.now();
    
    return {
      success: true,
      message: "🤰 **GROSSESSE CONFIRMÉE**\n\nDurée: 9 jours de jeu (9h réelles)\nPrends soin de ta santé !"
    };
  }

  async checkPregnancy(player) {
    if (!player.family?.pregnant) return null;

    const elapsed = Date.now() - player.family.pregnancyStart;
    const pregnancyDuration = 9 * 3600000; // 9 heures réelles = 9 jours jeu

    if (elapsed >= pregnancyDuration) {
      return await this.giveBirth(player);
    }

    const daysLeft = Math.ceil((pregnancyDuration - elapsed) / 3600000);
    return {
      status: 'pregnant',
      daysLeft,
      message: `🤰 Grossesse en cours (${daysLeft} jours restants)`
    };
  }

  async giveBirth(player) {
    const childGender = Math.random() > 0.5 ? 'garçon' : 'fille';
    const child = {
      id: Date.now().toString(),
      name: null,
      gender: childGender,
      birthDate: Date.now(),
      age: 0
    };

    player.family.children.push(child);
    player.family.pregnant = false;
    player.family.pregnancyStart = null;

    return {
      status: 'birth',
      child,
      message: `👶 **NAISSANCE !**\n\nFélicitations ! C'est un${childGender === 'fille' ? 'e' : ''} ${childGender} !\n\nChoisis un prénom avec: /nommer_enfant [prénom]`
    };
  }

  async nameChild(player, childId, name) {
    const child = player.family.children.find(c => c.id === childId);
    if (!child) return { success: false };

    child.name = name;
    return {
      success: true,
      message: `✅ Ton enfant s'appelle maintenant ${name} !`
    };
  }

  async updateChildren(player) {
    if (!player.family?.children) return;

    for (const child of player.family.children) {
      const ageInDays = Math.floor((Date.now() - child.birthDate) / 3600000);
      child.age = ageInDays;
    }
  }

  getChildrenDisplay(player) {
    if (!player.family?.children || player.family.children.length === 0) {
      return "Pas d'enfants";
    }

    let display = "👨‍👩‍👧‍👦 **ENFANTS**\n";
    for (const child of player.family.children) {
      display += `• ${child.name || 'Sans nom'} (${child.age} jours) - ${child.gender}\n`;
    }
    return display;
  }
}

export default new FamilyManager();

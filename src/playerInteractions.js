
import database from './database.js';
import playerManager from './player.js';

class PlayerInteractionsManager {
  constructor() {
    this.marriageProposals = new Map(); // phoneNumber -> { to: phoneNumber, timestamp }
    this.combatRequests = new Map();
  }

  // SYSTÈME DE MARIAGE
  async proposeMarriage(from, to) {
    const proposalKey = `${from}_${to}`;
    
    if (this.marriageProposals.has(proposalKey)) {
      return { success: false, message: "💍 Tu as déjà fait une demande à cette personne." };
    }

    this.marriageProposals.set(proposalKey, {
      from,
      to,
      timestamp: Date.now()
    });

    return {
      success: true,
      message: `💍 **DEMANDE EN MARIAGE**\n\nTu as demandé en mariage ${to}.\nEn attente de la réponse...`,
      notification: `💍 ${from} te demande en mariage ! Tape /accepter_mariage pour accepter ou /refuser_mariage pour refuser.`
    };
  }

  async acceptMarriage(phoneNumber) {
    // Chercher une proposition adressée à ce joueur
    let proposalKey = null;
    let proposal = null;

    for (const [key, prop] of this.marriageProposals.entries()) {
      if (prop.to === phoneNumber) {
        proposalKey = key;
        proposal = prop;
        break;
      }
    }

    if (!proposal) {
      return { success: false, message: "❌ Aucune demande en mariage en attente." };
    }

    // Récupérer les deux joueurs
    const player1 = await database.getPlayer(proposal.from);
    const player2 = await database.getPlayer(proposal.to);

    if (!player1 || !player2) {
      return { success: false, message: "❌ Erreur: joueur introuvable." };
    }

    // Vérifier qu'ils sont dans la même ville
    if (player1.position.location !== player2.position.location) {
      this.marriageProposals.delete(proposalKey);
      return { success: false, message: "❌ Vous devez être dans la même ville pour vous marier." };
    }

    // Créer le mariage
    if (!player1.family) player1.family = { pregnant: false, children: [] };
    if (!player2.family) player2.family = { pregnant: false, children: [] };

    player1.family.spouse = player2.phoneNumber;
    player1.family.spouseName = player2.customName || player2.name;
    player1.family.marriageDate = Date.now();

    player2.family.spouse = player1.phoneNumber;
    player2.family.spouseName = player1.customName || player1.name;
    player2.family.marriageDate = Date.now();

    await database.savePlayer(player1.phoneNumber, player1);
    await database.savePlayer(player2.phoneNumber, player2);

    this.marriageProposals.delete(proposalKey);

    return {
      success: true,
      message: `💒 **MARIAGE CÉLÉBRÉ !**\n\n${player1.customName || player1.name} et ${player2.customName || player2.name} sont maintenant mariés !\n\n🎉 Félicitations aux jeunes mariés !`,
      player1,
      player2
    };
  }

  async refuseMarriage(phoneNumber) {
    let proposalKey = null;

    for (const [key, prop] of this.marriageProposals.entries()) {
      if (prop.to === phoneNumber) {
        proposalKey = key;
        break;
      }
    }

    if (!proposalKey) {
      return { success: false, message: "❌ Aucune demande en mariage en attente." };
    }

    this.marriageProposals.delete(proposalKey);
    return { success: true, message: "💔 Tu as refusé la demande en mariage." };
  }

  // SYSTÈME DE COMBAT
  async challengePlayer(from, to) {
    const combatKey = `${from}_${to}`;

    if (this.combatRequests.has(combatKey)) {
      return { success: false, message: "⚔️ Tu as déjà défié cette personne." };
    }

    this.combatRequests.set(combatKey, {
      from,
      to,
      timestamp: Date.now()
    });

    return {
      success: true,
      message: `⚔️ **DÉFI LANCÉ**\n\nTu as défié ${to} en combat.\nEn attente de la réponse...`,
      notification: `⚔️ ${from} te défie en combat ! Tape /accepter_combat pour accepter ou /refuser_combat pour refuser.`
    };
  }

  async acceptCombat(phoneNumber) {
    let combatKey = null;
    let request = null;

    for (const [key, req] of this.combatRequests.entries()) {
      if (req.to === phoneNumber) {
        combatKey = key;
        request = req;
        break;
      }
    }

    if (!request) {
      return { success: false, message: "❌ Aucun défi en combat en attente." };
    }

    const player1 = await database.getPlayer(request.from);
    const player2 = await database.getPlayer(request.to);

    if (!player1 || !player2) {
      return { success: false, message: "❌ Erreur: joueur introuvable." };
    }

    // Vérifier qu'ils sont dans la même ville
    if (player1.position.location !== player2.position.location) {
      this.combatRequests.delete(combatKey);
      return { success: false, message: "❌ Vous devez être dans la même ville pour combattre." };
    }

    // Simuler le combat
    const result = this.simulateCombat(player1, player2);

    // Appliquer les dégâts
    playerManager.updateStats(player1, { health: -result.damage1, energy: -20 });
    playerManager.updateStats(player2, { health: -result.damage2, energy: -20 });

    await database.savePlayer(player1.phoneNumber, player1);
    await database.savePlayer(player2.phoneNumber, player2);

    this.combatRequests.delete(combatKey);

    return {
      success: true,
      message: result.message,
      player1,
      player2
    };
  }

  simulateCombat(player1, player2) {
    const skill1 = player1.skills.combat || 0;
    const skill2 = player2.skills.combat || 0;

    // Calculer les dégâts basés sur les compétences
    const baseDamage1 = 10 + Math.floor(skill1 / 5);
    const baseDamage2 = 10 + Math.floor(skill2 / 5);

    // Ajouter de l'aléatoire
    const damage1 = baseDamage1 + Math.floor(Math.random() * 15);
    const damage2 = baseDamage2 + Math.floor(Math.random() * 15);

    // Déterminer le vainqueur
    const winner = damage1 > damage2 ? player1 : player2;
    const loser = damage1 > damage2 ? player2 : player1;

    const message = `⚔️ **COMBAT !**\n\n${player1.customName || player1.name} VS ${player2.customName || player2.name}\n\n💥 ${player1.customName || player1.name}: -${damage2} HP\n💥 ${player2.customName || player2.name}: -${damage1} HP\n\n🏆 **VAINQUEUR: ${winner.customName || winner.name}**\n\nLes deux combattants sont épuisés (-20 énergie)`;

    return {
      damage1: damage2,
      damage2: damage1,
      winner,
      loser,
      message
    };
  }

  async refuseCombat(phoneNumber) {
    let combatKey = null;

    for (const [key, req] of this.combatRequests.entries()) {
      if (req.to === phoneNumber) {
        combatKey = key;
        break;
      }
    }

    if (!combatKey) {
      return { success: false, message: "❌ Aucun défi en combat en attente." };
    }

    this.combatRequests.delete(combatKey);
    return { success: true, message: "🏳️ Tu as refusé le combat." };
  }

  // Récupérer les joueurs dans la même ville
  async getPlayersInCity(city, excludePhone = null) {
    const allPlayers = await database.players;
    const playersInCity = [];

    for (const [phone, player] of Object.entries(allPlayers)) {
      if (phone !== excludePhone && player.position.location === city && player.characterCreated) {
        playersInCity.push({
          phone,
          name: player.customName || player.name,
          level: Math.floor((player.job?.workHours || 0) / 10)
        });
      }
    }

    return playersInCity;
  }
}

export default new PlayerInteractionsManager();

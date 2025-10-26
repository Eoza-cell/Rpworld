import database from './database.js';

class NPCManager {
  async getNPCsInLocation(locationId) {
    const allNPCs = await database.getNPCs();
    return Object.values(allNPCs).filter(npc => npc.location === locationId);
  }

  async getNPC(npcId) {
    const npcs = await database.getNPCs();
    return npcs[npcId] || null;
  }

  async updateNPCAttitude(npcId, change) {
    const npcs = await database.getNPCs();
    if (npcs[npcId]) {
      npcs[npcId].attitude = Math.max(0, Math.min(100, npcs[npcId].attitude + change));
      await database.saveNPCs(npcs);
    }
  }

  async addMemory(npcId, playerId, action, impact) {
    const npcs = await database.getNPCs();
    if (npcs[npcId]) {
      npcs[npcId].memory.push({
        playerId,
        action,
        impact,
        timestamp: Date.now()
      });

      if (npcs[npcId].memory.length > 20) {
        npcs[npcId].memory.shift();
      }

      await database.saveNPCs(npcs);
    }
  }

  async getReaction(npc, action, player) {
    const playerHistory = npc.memory.filter(m => m.playerId === player.phoneNumber);
    let reactionTone = 'neutre';

    if (npc.attitude > 70) {
      reactionTone = 'amical';
    } else if (npc.attitude < 30) {
      reactionTone = 'hostile';
    } else if (npc.attitude < 50) {
      reactionTone = 'méfiant';
    }

    const reactions = {
      amical: [
        `${npc.name} te sourit chaleureusement.`,
        `${npc.name} t'accueille avec enthousiasme.`,
        `${npc.name} semble ravi de te voir.`
      ],
      neutre: [
        `${npc.name} te regarde avec indifférence.`,
        `${npc.name} te remarque à peine.`,
        `${npc.name} continue ses activités sans vraiment te prêter attention.`
      ],
      méfiant: [
        `${npc.name} te surveille du coin de l'œil.`,
        `${npc.name} garde ses distances.`,
        `${npc.name} semble sur ses gardes en ta présence.`
      ],
      hostile: [
        `${npc.name} te lance un regard noir.`,
        `${npc.name} t'observe avec hostilité.`,
        `${npc.name} semble prêt à en découdre.`
      ]
    };

    const toneReactions = reactions[reactionTone] || reactions.neutre;
    return toneReactions[Math.floor(Math.random() * toneReactions.length)];
  }

  async reactToPlayerAction(action, player, locationId) {
    const npcsPresent = await this.getNPCsInLocation(locationId);
    const reactions = [];

    for (const npc of npcsPresent) {
      let attitudeChange = 0;


  async getBossForJob(jobName) {
    const bosses = {
      'Livreur': 'npc_boss_delivery',
      'Serveur': 'npc_boss_resto',
      'Mécanicien': 'npc_boss_garage',
      'Chauffeur Taxi': 'npc_boss_taxi',
      'Cuisinier': 'npc_boss_chef',
      'Vendeur': 'npc_boss_shop',
      'Gardien de Sécurité': 'npc_boss_security',
      'Dealer (Illégal)': 'npc_boss_gang',
      'Braqueur (Illégal)': 'npc_boss_crime'
    };
    
    return bosses[jobName] || 'Le Manager';
  }

  async checkWorkAttendance(player, currentHour) {
    if (!player.job.current) return null;
    
    const shouldWork = (currentHour >= 8 && currentHour <= 13) || currentHour >= 19;
    
    if (shouldWork && !player.job.atWork) {
      return {
        warning: true,
        boss: await this.getBossForJob(player.job.current),
        period: currentHour >= 8 && currentHour <= 13 ? 'matin (8h-13h)' : 'soir (19h+)'
      };
    }
    
    return null;
  }

      let memory = '';

      const actionType = action.type || action.detectedType;
      
      switch (actionType) {
        case 'vol':
          attitudeChange = -20;
          memory = 'a commis un vol';
          break;
        case 'combat':
          attitudeChange = -15;
          memory = 'a été violent';
          break;
        case 'interaction':
          attitudeChange = 5;
          memory = 'a été sociable';
          break;
        case 'commerce':
          attitudeChange = 3;
          memory = 'a fait du commerce';
          break;
      }

      if (attitudeChange !== 0) {
        await this.updateNPCAttitude(npc.id, attitudeChange);
        await this.addMemory(npc.id, player.phoneNumber, memory, attitudeChange);
      }

      const reaction = await this.getReaction(npc, action, player);
      reactions.push(reaction);
    }

    return reactions;
  }

  async getBossForJob(jobName) {
    const bosses = {
      'Livreur': 'npc_boss_delivery',
      'Serveur': 'npc_boss_resto',
      'Mécanicien': 'npc_boss_garage',
      'Chauffeur Taxi': 'npc_boss_taxi',
      'Cuisinier': 'npc_boss_chef',
      'Vendeur': 'npc_boss_shop',
      'Gardien de Sécurité': 'npc_boss_security',
      'Dealer (Illégal)': 'npc_boss_gang',
      'Braqueur (Illégal)': 'npc_boss_crime'
    };
    
    return bosses[jobName] || 'Le Manager';
  }

  async checkWorkAttendance(player, currentHour) {
    if (!player.job.current) return null;
    
    const shouldWork = (currentHour >= 8 && currentHour <= 13) || currentHour >= 19;
    
    if (shouldWork && !player.job.atWork) {
      return {
        warning: true,
        boss: await this.getBossForJob(player.job.current),
        period: currentHour >= 8 && currentHour <= 13 ? 'matin (8h-13h)' : 'soir (19h+)'
      };
    }
    
    return null;
  }

  getNPCsDescription(npcs) {
    if (npcs.length === 0) return "La zone est déserte.";
    
    const names = npcs.map(npc => npc.name).join(', ');
    return `👥 Présent(s): ${names}`;
  }
}

export default new NPCManager();

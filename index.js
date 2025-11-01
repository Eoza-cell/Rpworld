import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';

import database from './src/database.js';
import playerManager from './src/player.js';
import worldManager from './src/world.js';
import actionDetector from './src/actionDetector.js';
import consequences from './src/consequences.js';
import npcManager from './src/npcs.js';
import pollinations from './src/pollinations.js';
import webServer from './src/webServer.js';
import economy from './src/economy.js';
import movementManager from './src/movement.js';
import familyManager from './src/family.js';
import mapGenerator from './src/mapGenerator.js';

dotenv.config();

class EspritMondeBot {
  constructor() {
    this.sock = null;
    this.isReady = false;
  }

  async init() {
    console.log('🌐 Initialisation ESPRIT-MONDE...');

    webServer.init();
    webServer.updateStatus('Initialisation de la base de données...', false);

    await database.init();
    console.log('✅ Base de données initialisée');
    webServer.updateStatus('Initialisation du monde...', false);

    await worldManager.init();
    console.log('✅ Monde ESPRIT-MONDE initialisé');
    webServer.updateStatus('Connexion à WhatsApp...', false);

    await this.connectToWhatsApp();
    this.startGameLoop();
  }

  startGameLoop() {
    console.log('🎮 Démarrage de la boucle de jeu...');
    setInterval(() => {
      this.gameTick();
    }, 60000); // Toutes les 60 secondes
  }

  async gameTick() {
    console.log('⏳ Tick de jeu pour l\'IA proactive...');

    const allPlayers = await database.getAllPlayers();
    const activePlayers = Object.values(allPlayers).filter(p => Date.now() - p.lastActive < 1000 * 60 * 60 * 24); // Actifs dans les 24h

    if (activePlayers.length === 0) {
      console.log('Aucun joueur actif. L\'IA se repose.');
      return;
    }

    const time = await worldManager.getCurrentTime();

    const context = {
      time,
      activePlayers: activePlayers.map(p => ({ name: p.name, location: p.position.location }))
    };

    const decision = await pollinations.decideNextWorldEvent(context);

    if (decision.event === 'none') {
      console.log('Décision du MJ: Rien ne se passe.');
      return;
    }

    console.log(`⚡ Événement mondial déclenché par le MJ: ${decision.event}`, decision.data);

    switch (decision.event) {
      case 'npc_message':
        const targetPlayer = activePlayers.find(p => p.phoneNumber === decision.data.player_phone);
        if (targetPlayer) {
          const from = targetPlayer.phoneNumber + '@s.whatsapp.net';
          const message = `📱 SMS de ${decision.data.npc_name}:\n\n${decision.data.message}`;
          await this.sendMessage(from, message);
        }
        break;

      case 'minor_incident':
        // Envoyer à tous les joueurs dans le lieu de l'incident
        const playersInLocation = activePlayers.filter(p => p.position.location === decision.data.location);
        for (const player of playersInLocation) {
          const from = player.phoneNumber + '@s.whatsapp.net';
          await this.sendMessage(from, `📢 Événement à ${decision.data.location}: ${decision.data.description}`);
        }
        break;
    }
  }

  async connectToWhatsApp() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

      const connectionMethod = process.env.CONNECTION_METHOD || 'pairing';
      const phoneNumber = process.env.PHONE_NUMBER;

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '128.0.6613.86'],
        version: [2, 3000, 1025190524],
        getMessage: async key => {
          console.log('⚠️ Message non déchiffré, retry demandé:', key);
          return { conversation: '🔄 Réessaye d\'envoyer ton message' };
        }
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          if (connectionMethod === 'pairing' && phoneNumber && !this.sock.authState.creds.registered) {
            try {
              const code = await this.sock.requestPairingCode(phoneNumber);
              const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

              console.log('\n🔑 CODE DE JUMELAGE WHATSAPP');
              console.log('━'.repeat(50));
              console.log(`📱 Code: ${formattedCode}`);
              console.log('📲 Étapes:');
              console.log('   1. Ouvrez WhatsApp sur votre téléphone');
              console.log('   2. Allez dans Paramètres > Appareils connectés');
              console.log('   3. Appuyez sur "Connecter un appareil"');
              console.log('   4. Entrez ce code: ' + formattedCode);
              console.log('━'.repeat(50));
              console.log('⏳ En attente de la connexion...\n');

              webServer.updatePairingCode(formattedCode);
              webServer.updateStatus(`🔑 Code de jumelage: ${formattedCode}`, false);
            } catch (error) {
              console.error('❌ Erreur lors de la génération du code de jumelage:', error);
              console.log('🔄 Basculement vers le mode QR Code...');
              console.log('\n📱 Scannez ce QR Code avec WhatsApp:\n');
              qrcode.generate(qr, { small: true });
              console.log('\n⏳ En attente du scan...\n');

              webServer.updateQRCode(qr);
              webServer.updateStatus('⏳ En attente du scan QR Code', false);
            }
          } else if (connectionMethod === 'qr' || !phoneNumber) {
            console.log('\n📱 Scannez ce QR Code avec WhatsApp:\n');
            qrcode.generate(qr, { small: true });
            console.log('\n⏳ En attente du scan...\n');

            webServer.updateQRCode(qr);
            webServer.updateStatus('⏳ En attente du scan QR Code', false);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const errorMessage = lastDisconnect?.error?.message || 'Erreur inconnue';

          console.log('❌ Connexion fermée.');
          console.log('📝 Raison:', errorMessage);
          console.log('📋 Code:', statusCode);

          webServer.updateStatus(`❌ Déconnecté: ${errorMessage}`, false);
          webServer.updateQRCode(null);

          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            console.log('🔄 Reconnexion dans 3 secondes...');
            webServer.updateStatus('🔄 Reconnexion en cours...', false);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.connectToWhatsApp();
          } else {
            console.log('⚠️ Déconnecté. Supprimez le dossier auth_info_baileys et relancez.');
            webServer.updateStatus('⚠️ Déconnecté - Redémarrage requis', false);
          }
        } else if (connection === 'open') {
          console.log('✅ Bot connecté à WhatsApp !');
          console.log('🎮 ESPRIT-MONDE est prêt à jouer !');
          this.isReady = true;

          webServer.updateStatus('✅ Connecté - Bot actif', true);
          webServer.updateQRCode(null);
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
          await this.handleMessage(messages);
        }
      });
    } catch (error) {
      console.error('💥 Erreur lors de la connexion:', error);
      console.log('🔄 Nouvelle tentative dans 5 secondes...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await this.connectToWhatsApp();
    }
  }

  async handleMessage(messages) {
    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;

      const from = message.key.remoteJid;
      const text = message.message.conversation ||
                   message.message.extendedTextMessage?.text || '';
      const participant = message.key.participant;
      const pushName = message.pushName || 'Joueur';

      if (!text) continue;

      const isGroup = from.endsWith('@g.us');

      // Stabilité: s'assurer que l'objet `user` est défini avant de l'utiliser
      if (this.sock.user && this.sock.user.id) {
        const botNumber = this.sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isMentioned = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botNumber);

        if (isMentioned) {
          await this.handleGameMasterConversation(from, text, participant, pushName);
          continue;
        }
      }

      if (isGroup && !text.startsWith('/')) {
        await this.handleGameMasterConversation(from, text, participant, pushName);
        continue;
      }

      if (isGroup && !text.startsWith('/')) {
        continue;
      }

      console.log(`📨 Message de ${from}${participant ? ` (${participant})` : ''}: ${text}`);

      try {
        await this.processPlayerAction(from, text, isGroup, participant, pushName);

        const playerCount = Object.keys(database.players).length;
        webServer.updatePlayerCount(playerCount);
      } catch (error) {
        console.error('Erreur traitement message:', error);
        await this.sendMessage(from, "❌ Une erreur s'est produite dans ESPRIT-MONDE...");
      }
    }
  }

  async processPlayerAction(from, text, isGroup, participant, pushName) {
    const phoneNumber = isGroup ? participant.replace('@s.whatsapp.net', '') : from.replace('@s.whatsapp.net', '');
    const player = await playerManager.getOrCreatePlayer(phoneNumber, pushName);

    // Commande tag all (admin seulement en groupe)
    if (text.toLowerCase() === '/tagall' || text.toLowerCase() === '/everyone') {
      if (isGroup) {
        await this.tagAllMembers(from);
      }
      return;
    }

    if (text.toLowerCase() === '/start' || text.toLowerCase() === '/commencer') {
      if (!player.characterCreated) {
        await this.startCharacterCreation(from, player, isGroup);
      } else {
        await this.sendWelcomeMessage(from, player, isGroup);
      }
      return;
    }

    // Gestion création de personnage
    if (!player.characterCreated && player.creationStep) {
      await this.handleCharacterCreation(from, player, text, isGroup);
      return;
    }

    if (!player.characterCreated) {
      await this.sendMessage(from, "⚠️ Tu dois d'abord créer ton personnage avec /start");
      return;
    }

    if (text.toLowerCase() === '/stats') {
      const stats = playerManager.getStatsDisplay(player);
      const location = await worldManager.getLocationDescription(player.position.location);
      const familyInfo = familyManager.getChildrenDisplay(player);
      const pregnancyCheck = await familyManager.checkPregnancy(player);

      let message = `${stats}\n\n${location}\n\n${familyInfo}`;
      if (pregnancyCheck) {
        message += `\n\n${pregnancyCheck.message}`;
      }

      await this.sendMessage(from, message);
      return;
    }

    if (text.toLowerCase() === '/carte' || text.toLowerCase() === '/map') {
      const map = mapGenerator.generateCityMap(player.position.location, player.position.x, player.position.y);
      const surroundings = movementManager.getSurroundings(player.position.location, player.position.x, player.position.y);
      await this.sendMessage(from, `${map}\n\n${surroundings}`);
      return;
    }

    if (text.toLowerCase().startsWith('/aller ')) {
      const district = text.split(' ')[1];
      const hasVehicle = player.inventory.vehicles.length > 0;
      const hasLicense = player.licenses.driving;

      const result = await movementManager.move(player, district, hasVehicle, hasLicense);

      if (result.accident) {
        playerManager.updateStats(player, { health: -result.damage });
        playerManager.addMoney(player, -500);
        await database.savePlayer(player.phoneNumber, player);
      } else if (result.success) {
        playerManager.updateStats(player, { energy: result.energyCost });
        await worldManager.advanceTime(result.timeCost);
        await database.savePlayer(player.phoneNumber, player);
      }

      await this.sendMessage(from, result.message);
      return;
    }

    if (text.toLowerCase().startsWith('/nommer_enfant ')) {
      const parts = text.split(' ');
      const name = parts.slice(1).join(' ');

      if (player.family?.children && player.family.children.length > 0) {
        const lastChild = player.family.children[player.family.children.length - 1];
        if (!lastChild.name) {
          const result = await familyManager.nameChild(player, lastChild.id, name);
          await database.savePlayer(player.phoneNumber, player);
          await this.sendMessage(from, result.message);
          return;
        }
      }
      await this.sendMessage(from, "❌ Pas d'enfant à nommer");
      return;
    }

    if (text.toLowerCase() === '/help' || text.toLowerCase() === '/aide') {
      await this.sendHelpMessage(from, isGroup);
      return;
    }

    if (text.toLowerCase() === '/metiers' || text.toLowerCase() === '/jobs') {
      await this.showJobs(from, player);
      return;
    }

    if (text.toLowerCase().startsWith('/postuler ')) {
      const jobId = text.split(' ')[1];
      await this.applyForJob(from, player, jobId);
      return;
    }

    if (text.toLowerCase() === '/permis' || text.toLowerCase() === '/licenses') {
      await this.showLicenses(from, player);
      return;
    }

    if (text.toLowerCase().startsWith('/acheter_permis ')) {
      const licenseType = text.split(' ')[1];
      await this.buyLicense(from, player, licenseType);
      return;
    }

    if (text.toLowerCase() === '/vehicules' || text.toLowerCase() === '/vehicles') {
      await this.showVehicles(from, player);
      return;
    }

    if (text.toLowerCase().startsWith('/acheter_vehicule ')) {
      const vehicleId = text.split(' ')[1];
      await this.buyVehicle(from, player, vehicleId);
      return;
    }

    if (text.toLowerCase() === '/banque' || text.toLowerCase() === '/bank') {
      await this.showBank(from, player);
      return;
    }

    if (text.toLowerCase().startsWith('/deposer ')) {
      const amount = parseInt(text.split(' ')[1]);
      await this.depositMoney(from, player, amount);
      return;
    }

    if (text.toLowerCase().startsWith('/retirer ')) {
      const amount = parseInt(text.split(' ')[1]);
      await this.withdrawMoney(from, player, amount);
      return;
    }

    if (text.toLowerCase() === '/travailler' || text.toLowerCase() === '/work') {
      await this.goToWork(from, player);
      return;
    }

    if (text.toLowerCase() === '/finir' || text.toLowerCase() === '/finish') {
      await this.finishWork(from, player);
      return;
    }

    if (!playerManager.isAlive(player)) {
      await this.sendMessage(from, "💀 Tu es mort. Tape /start pour recommencer une nouvelle vie.");
      return;
    }

    // Vérification horaires de travail
    const time = await worldManager.getCurrentTime();
    const workCheck = await worldManager.shouldBeAtWork(player, time.hour);

    if (workCheck.shouldBe && player.job.current && !player.job.atWork) {
      const boss = await npcManager.getBossForJob(player.job.current);
      await this.sendMessage(from, `⚠️ ${boss} te rappelle que tu devrais être au travail (${workCheck.workPeriod}) !\n💼 Ton patron n'est pas content de ton retard.\n\nTape /travailler pour aller bosser.`);
      await npcManager.updateNPCAttitude(boss, -5);
    }

    await this.handleFreeAction(from, player, text, isGroup);
  }

  async handleFreeAction(from, player, actionText, isGroup) {
    // Validation physique réaliste
    const validation = playerManager.validateAction(actionText, player);
    if (!validation.valid) {
      await this.sendMessage(from, validation.reason);
      return;
    }

    // Vérifier grossesse
    const pregnancyCheck = await familyManager.checkPregnancy(player);
    if (pregnancyCheck?.status === 'birth') {
      await this.sendMessage(from, pregnancyCheck.message);
      await database.savePlayer(player.phoneNumber, player);
    }

    // Mise à jour des enfants
    await familyManager.updateChildren(player);

    await this.sendMessage(from, "⏳ ESPRIT-MONDE analyse ton action...");

    const currentLocation = await worldManager.getLocation(player.position.location);
    const time = await worldManager.getCurrentTime();

    const actionAnalysis = await actionDetector.analyzeAction(actionText, {
      player,
      location: currentLocation,
      time
    });

    const calculatedConsequences = await consequences.calculate(
      actionAnalysis,
      player,
      currentLocation
    );

    playerManager.updateStats(player, calculatedConsequences.statChanges);

    if (calculatedConsequences.positionChange) {
      playerManager.updatePosition(player, calculatedConsequences.positionChange);
    }

    if (calculatedConsequences.inventoryChange) {
      if (calculatedConsequences.inventoryChange.money) {
        playerManager.addMoney(player, calculatedConsequences.inventoryChange.money);
      }
    }

    if (calculatedConsequences.wantedChange) {
      playerManager.updateStats(player, { wanted: calculatedConsequences.wantedChange });
    }

    const npcsPresent = await npcManager.getNPCsInLocation(player.position.location);
    const npcReactions = await npcManager.reactToPlayerAction(
      actionAnalysis,
      player,
      player.position.location
    );

    playerManager.addToHistory(player, actionText, calculatedConsequences);
    await database.savePlayer(from, player);

    const narrativeContext = {
      action: actionText,
      playerName: player.name,
      playerStats: player.stats,
      location: currentLocation?.name || player.position.location,
      time: `${time.hour}h, ${time.period}`,
      weather: time.weather,
      consequences: JSON.stringify(calculatedConsequences.statChanges),
      npcsPresent: npcsPresent.map(n => n.name).join(', ') || 'personne',
      history: player.history.slice(-1)[0]?.action || 'aucune action récente',
      inventory: player.inventory.items.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'rien',
      money: `${player.inventory.money}$`
    };

    // Génération de la narration et de l'image en parallèle
    const [narrative, imageUrl] = await Promise.all([
      pollinations.generateNarrative(narrativeContext),
      pollinations.generateImage(actionText) // Utiliser le texte de l'action brute pour l'image
    ]);

    // Construction de la réponse textuelle
    let textResponse = '';
    if (npcReactions.length > 0) {
      textResponse += `👥 ${npcReactions.join(' ')}\n\n`;
    }
    textResponse += playerManager.getStatsDisplay(player);
    if (calculatedConsequences.events.length > 0) {
      textResponse += `\n\n⚡ Événements: ${calculatedConsequences.events.join(', ')}`;
    }

    // Envoi de l'image avec la narration comme légende
    if (imageUrl) {
      await this.sendImage(from, imageUrl, `${narrative}\n\n${textResponse}`);
    } else {
      // Fallback si l'image échoue: envoyer un message texte complet
      await this.sendMessage(from, `🎭 **ESPRIT-MONDE**\n\n${narrative}\n\n${textResponse}`);
    }

    if (!playerManager.isAlive(player)) {
      await this.sendMessage(from, "\n\n💀 **TU ES MORT**\nTa santé est tombée à zéro. Ton aventure se termine ici.\nTape /start pour recommencer.");
    }
  }

  async handleGameMasterConversation(from, text, participant, pushName) {
    const phoneNumber = participant.replace('@s.whatsapp.net', '');
    const player = await playerManager.getOrCreatePlayer(phoneNumber, pushName);
    const time = await worldManager.getCurrentTime();

    const context = {
      playerName: player.name,
      playerPhoneNumber: player.phoneNumber,
      playerHistory: player.history.slice(-1)[0]?.action || 'aucune action récente',
      worldTime: `${time.hour}h, ${time.period}`,
      worldWeather: time.weather,
      message: text,
    };

    const response = await pollinations.generateConversationResponse(context);
    await this.sendMessage(from, `🎭 **MJ ESPRIT-MONDE**\n\n${response}`);
  }

  async sendWelcomeMessage(chatId, player, isGroup = false) {
    const greeting = isGroup ? `🎮 ${player.name}, bienvenue dans ESPRIT-MONDE !` : `🌍 **ESPRIT-MONDE** 🌍`;

    const welcome = `${greeting}

Tu es ${player.name}, voyageur du monde où chaque action a des conséquences réelles.

🎮 **SYSTÈME ESPRIT-MONDE**
Une IA contrôle tout: le temps, les PNJ, les événements, et réagit à tes actions libres.

📊 **Tes Stats**
${playerManager.getStatsDisplay(player)}

📍 **Ta Position**
${await worldManager.getLocationDescription(player.position.location)}

✍️ **Comment jouer**
Écris simplement ce que tu veux faire en langage naturel:
- "Je vais à Tokyo"
- "Je me promène dans les rues"
- "Je parle aux passants"
- "J'achète de la nourriture"

⌨️ **Commandes**
/stats - Voir tes statistiques
/help - Aide complète

🌟 Ton aventure commence maintenant. Que fais-tu ?`;

    await this.sendMessage(chatId, welcome);
  }

  async sendHelpMessage(chatId, isGroup = false) {
    const help = `📚 **GUIDE ESPRIT-MONDE**

**Actions Libres:**
Écris ce que tu veux faire naturellement. L'IA comprend et réagit.
⚠️ Attention: Pas de super-pouvoirs ! Tu es un humain normal.

**Barres d'État:**
❤️ Santé - Si 0%, tu meurs
⚡ Énergie - Diminue avec l'action
🍔 Faim - Mange pour survivre
🧠 Mental - Affecté par le stress
🚨 Wanted - Niveau de recherche police

**Commandes Principales:**
/stats - Tes statistiques complètes
/carte - Carte de ta ville
/aller [quartier] - Se déplacer (ex: /aller marais)
/metiers - Voir les métiers
/travailler - Aller bosser (optionnel)
/finir - Finir le travail
/permis - Voir les permis
/vehicules - Voir les véhicules
/banque - Compte bancaire
/help - Cette aide

**Famille:**
/nommer_enfant [prénom] - Nommer ton nouveau-né

**Économie:**
/postuler [métier] - Postuler à un métier
/acheter_permis [type] - Acheter un permis
/acheter_vehicule [type] - Acheter un véhicule
/deposer [montant] - Déposer à la banque
/retirer [montant] - Retirer de la banque

**🚗 Déplacement:**
- Sans permis en voiture = ACCIDENTS possibles !
- Distances réalistes calculées en mètres
- Regarde la carte pour savoir où aller

**⏰ Horloge du Monde:**
- 1h réelle = 1 jour complet (24h)
- Travail: 8h-13h (matin) et 19h+ (soir)
- Le temps avance automatiquement

**Villes du Monde:**
🇫🇷 Paris • 🇯🇵 Tokyo • 🇺🇸 New York • 🇦🇪 Dubai
🇬🇧 Londres • 🇧🇷 Rio • 🇦🇺 Sydney • 🇹🇷 Istanbul
🇷🇺 Moscou • 🇹🇭 Bangkok • 🇺🇸 Los Angeles • 🇩🇪 Berlin
🇨🇦 Montréal • 🇳🇱 Amsterdam • 🇰🇷 Séoul`;

    await this.sendMessage(chatId, help);
  }

  async showJobs(chatId, player) {
    const jobs = economy.getJobsList();
    let message = '💼 **MÉTIERS DISPONIBLES**\n\n';

    jobs.forEach(job => {
      const canApply = economy.canApplyForJob(player, job.id);
      message += `**${job.name}** ${job.illegal ? '⚠️' : ''}\n`;
      message += `💰 Salaire: ${job.salary}$/mois\n`;
      message += `${canApply.can ? '✅ Disponible' : '❌ ' + canApply.reason}\n`;
      message += `Commande: /postuler ${job.id}\n\n`;
    });

    await this.sendMessage(chatId, message);
  }

  async applyForJob(chatId, player, jobId) {
    const canApply = economy.canApplyForJob(player, jobId);

    if (!canApply.can) {
      await this.sendMessage(chatId, `❌ ${canApply.reason}`);
      return;
    }

    const job = economy.jobs[jobId];
    playerManager.setJob(player, job.name, job.salary);
    await database.savePlayer(player.phoneNumber, player);

    await this.sendMessage(chatId, `✅ Félicitations ! Tu es maintenant ${job.name}.\n💰 Salaire: ${job.salary}$/mois\n\nTravaille pour gagner de l'argent et de l'expérience !`);
  }

  async goToWork(chatId, player) {
    if (!player.job.current) {
      await this.sendMessage(chatId, "❌ Tu n'as pas de travail. Utilise /metiers pour en trouver un.");
      return;
    }

    const time = await worldManager.getCurrentTime();
    const workCheck = await worldManager.shouldBeAtWork(player, time.hour);

    if (!workCheck.shouldBe) {
      await this.sendMessage(chatId, "⏰ Ce n'est pas l'heure de travail.\n📅 Horaires: 8h-13h (matin) ou 19h+ (soir)");
      return;
    }

    player.job.atWork = true;
    player.job.lastWorkCheck = Date.now();
    await database.savePlayer(player.phoneNumber, player);

    await this.sendMessage(chatId, `✅ ${player.customName || player.name} arrive au travail.\n💼 ${player.job.current}\n⏰ ${workCheck.workPeriod}\n\nTravaille bien ! Tape /finir quand tu as terminé.`);
  }

  async finishWork(chatId, player) {
    if (!player.job.atWork) {
      await this.sendMessage(chatId, "❌ Tu n'es pas au travail.");
      return;
    }

    const hoursWorked = Math.min(5, Math.floor((Date.now() - player.job.lastWorkCheck) / 60000));
    const result = playerManager.addWorkHours(player, hoursWorked);
    result.player.job.atWork = false;

    await database.savePlayer(player.phoneNumber, result.player);

    await this.sendMessage(chatId, `✅ Travail terminé !\n⏱️ Heures: ${hoursWorked}h\n💰 Salaire: +${result.earnings}$\n\nBon repos !`);
  }

  async showLicenses(chatId, player) {
    let message = '📜 **PERMIS ET LICENCES**\n\n';

    message += `🚗 Permis de Conduire: ${player.licenses.driving ? '✅ Obtenu' : '❌ Non obtenu (500$)'}\n`;
    message += `🔫 Permis de Port d\'Arme: ${player.licenses.gun ? '✅ Obtenu' : '❌ Non obtenu (1000$)'}\n`;
    message += `🏢 Licence Commerciale: ${player.licenses.business ? '✅ Obtenu' : '❌ Non obtenu (2000$)'}\n\n`;

    message += 'Pour acheter: /acheter_permis [driving/gun/business]';

    await this.sendMessage(chatId, message);
  }

  async buyLicense(chatId, player, licenseType) {
    const licenseInfo = economy.getLicenseInfo(licenseType);

    if (!licenseInfo) {
      await this.sendMessage(chatId, '❌ Permis inconnu');
      return;
    }

    if (player.licenses[licenseType]) {
      await this.sendMessage(chatId, '❌ Tu possèdes déjà ce permis');
      return;
    }

    const result = playerManager.grantLicense(player, licenseType, licenseInfo.cost);

    if (result.success) {
      await database.savePlayer(player.phoneNumber, result.player);
      await this.sendMessage(chatId, `✅ ${licenseInfo.name} obtenu ! (-${licenseInfo.cost}$)`);
    } else {
      await this.sendMessage(chatId, `❌ Argent insuffisant (${licenseInfo.cost}$ requis)`);
    }
  }

  async showVehicles(chatId, player) {
    const vehicles = economy.getVehiclesList();
    let message = '🚗 **VÉHICULES DISPONIBLES**\n\n';

    vehicles.forEach(v => {
      message += `**${v.name}**\n`;
      message += `💰 Prix: ${v.price}$\n`;
      message += `⚡ Vitesse: ${'▰'.repeat(v.speed)}${'▱'.repeat(5-v.speed)}\n`;
      message += `${v.requiresLicense ? '🚗 Permis requis' : '✅ Pas de permis'}\n`;
      message += `Commande: /acheter_vehicule ${v.id}\n\n`;
    });

    if (player.inventory.vehicles.length > 0) {
      message += '\n**TES VÉHICULES:**\n';
      player.inventory.vehicles.forEach(v => {
        message += `🚗 ${v.name} - Carburant: ${v.fuel}%\n`;
      });
    }

    await this.sendMessage(chatId, message);
  }

  async buyVehicle(chatId, player, vehicleId) {
    const vehicleInfo = economy.getVehicleInfo(vehicleId);

    if (!vehicleInfo) {
      await this.sendMessage(chatId, '❌ Véhicule inconnu');
      return;
    }

    const result = playerManager.buyVehicle(player, vehicleInfo);

    if (result.success) {
      await database.savePlayer(player.phoneNumber, result.player);
      await this.sendMessage(chatId, `✅ ${vehicleInfo.name} acheté ! Tu peux maintenant te déplacer plus rapidement.`);
    } else if (result.reason === 'no_license') {
      await this.sendMessage(chatId, '❌ Permis de conduire requis ! Utilise /acheter_permis driving');
    } else {
      await this.sendMessage(chatId, `❌ Argent insuffisant (${vehicleInfo.price}$ requis)`);
    }
  }

  async showBank(chatId, player) {
    const message = `🏦 **BANQUE INTERNATIONALE**\n\n💰 Argent liquide: ${player.inventory.money}$\n🏦 Compte bancaire: ${player.inventory.bankAccount}$\n💎 Total: ${player.inventory.money + player.inventory.bankAccount}$\n\n/deposer [montant] - Déposer\n/retirer [montant] - Retirer`;
    await this.sendMessage(chatId, message);
  }

  async depositMoney(chatId, player, amount) {
    const result = playerManager.depositMoney(player, amount);
    if (result.success) {
      await database.savePlayer(player.phoneNumber, result.player);
      await this.sendMessage(chatId, `✅ ${amount}$ déposés à la banque`);
    } else {
      await this.sendMessage(chatId, '❌ Argent insuffisant');
    }
  }

  async withdrawMoney(chatId, player, amount) {
    const result = playerManager.withdrawMoney(player, amount);
    if (result.success) {
      await database.savePlayer(player.phoneNumber, result.player);
      await this.sendMessage(chatId, `✅ ${amount}$ retirés de la banque`);
    } else {
      await this.sendMessage(chatId, '❌ Fonds insuffisants');
    }
  }

  async sendMessage(to, text) {
    try {
      if (!text || text.trim() === '') return;
      await this.sock.sendMessage(to, { text });
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  }

  async sendImage(to, imageUrl, caption) {
    try {
      await this.sock.sendMessage(to, {
        image: { url: imageUrl },
        caption: `🎭 **ESPRIT-MONDE**\n\n${caption}`
      });
    } catch (error) {
      console.error('Erreur envoi image:', error);
      // Fallback: send text message if image fails
      await this.sendMessage(to, `🎭 **ESPRIT-MONDE**\n\n${caption}`);
    }
  }

  async startCharacterCreation(chatId, player, isGroup = false) {
    player.creationStep = 'name';
    await database.savePlayer(player.phoneNumber, player);

    const message = `🎭 **CRÉATION DE PERSONNAGE**

Bienvenue dans ESPRIT-MONDE ! Avant de commencer, créons ton personnage.

📝 **Étape 1/3 : Nom**
Quel est le nom de ton personnage ?

Exemple: Marc Dubois, Sarah Chen, etc.`;

    await this.sendMessage(chatId, message);
  }

  async handleCharacterCreation(chatId, player, text, isGroup = false) {
    const phoneNumber = player.phoneNumber;
    let processedText = text.trim();
    if (isGroup && processedText.startsWith('/')) {
      processedText = processedText.substring(1);
    }
    
    switch (player.creationStep) {
      case 'name':
        player.customName = processedText;
        player.creationStep = 'age';
        await database.savePlayer(phoneNumber, player);
        await this.sendMessage(chatId, `✅ Nom: ${player.customName}\n\n🎂 **Étape 2/4 : Âge**\nQuel âge a ${player.customName} ?\n\nTape un nombre entre 18 et 80.`);
        break;

      case 'age':
        const age = parseInt(processedText);
        if (isNaN(age) || age < 18 || age > 80) {
          await this.sendMessage(chatId, `❌ Âge invalide. Entre 18 et 80 ans.\n\nTape un nombre comme: 25`);
          return;
        }
        player.age = age;
        player.creationStep = 'gender';
        await database.savePlayer(phoneNumber, player);
        await this.sendMessage(chatId, `✅ Âge: ${age} ans\n\n⚧️ **Étape 3/4 : Genre**\nQuel est le genre de ${player.customName} ?\n\nTape: **homme** ou **femme**`);
        break;

      case 'gender':
        const gender = processedText.toLowerCase();
        if (gender !== 'homme' && gender !== 'femme') {
          await this.sendMessage(chatId, "❌ Genre invalide. Tape 'homme' ou 'femme'.");
          return;
        }
        player.gender = gender === 'homme' ? 'male' : 'female';
        player.creationStep = 'background';
        await database.savePlayer(phoneNumber, player);
        await this.sendMessage(chatId, `✅ Genre: ${gender}\n\n🎭 **Étape 4/4 : Background**\nQuel est le passé de ${player.customName} ?\n\n1️⃣ **athletique** - +10 Santé/Énergie, +10 Combat\n2️⃣ **intellectuel** - +15 Mental, +15 Négociation\n3️⃣ **streetwise** - -10 Wanted, +15 Discrétion\n4️⃣ **riche** - +2000$ cash, +5000$ banque\n5️⃣ **mecano** - +20 Réparation, +10 Conduite\n\nTape le nom du background choisi.`);
        break;

      case 'background':
        const validBackgrounds = ['athletique', 'intellectuel', 'streetwise', 'riche', 'mecano'];
        const bg = processedText.toLowerCase();

        if (!validBackgrounds.includes(bg)) {
          await this.sendMessage(chatId, "❌ Background invalide. Choisis parmi: athletique, intellectuel, streetwise, riche, mecano");
          return;
        }

        await playerManager.createCharacter(player, player.customName, player.age, bg);
        player.characterCreated = true;
        delete player.creationStep;
        await database.savePlayer(phoneNumber, player);

        await this.sendMessage(chatId, `🎉 **PERSONNAGE CRÉÉ !**

👤 ${player.customName}, ${player.age} ans (${player.gender === 'male' ? 'Homme' : 'Femme'})
🎭 Background: ${bg}

${playerManager.getStatsDisplay(player)}

📍 Position: Paris, France

✨ Ton aventure commence maintenant ! Que veux-tu faire ?`);
        break;
    }
  }

  async tagAllMembers(groupId) {
    try {
      const groupMetadata = await this.sock.groupMetadata(groupId);
      const participants = groupMetadata.participants.map(p => p.id);

      let mentions = participants.join(', @');
      let message = `📢 **ANNONCE ESPRIT-MONDE**\n\n@${mentions}\n\nLe bot est actif ! Tapez /start pour jouer.`;

      await this.sock.sendMessage(groupId, {
        text: message,
        mentions: participants
      });
    } catch (error) {
      console.error('Erreur tag all:', error);
    }
  }
}

const bot = new EspritMondeBot();
bot.init().catch(console.error);
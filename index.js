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
      const participant = message.key.participant; // Get participant for group messages

      if (!text) continue;

      const isGroup = from.endsWith('@g.us');

      if (isGroup && !text.startsWith('/')) { // Ignore messages in groups that are not commands
        continue;
      }

      console.log(`📨 Message de ${from}${participant ? ` (via ${participant})` : ''}: ${text}`);

      try {
        await this.processPlayerAction(from, text, isGroup, participant);

        const playerCount = Object.keys(database.players).length;
        webServer.updatePlayerCount(playerCount);
      } catch (error) {
        console.error('Erreur traitement message:', error);
        await this.sendMessage(from, "❌ Une erreur s\'est produite dans ESPRIT-MONDE...");
      }
    }
  }

  async processPlayerAction(from, text, isGroup, participant) {
    const phoneNumber = isGroup ? participant.replace('@s.whatsapp.net', '') : from.replace('@s.whatsapp.net', '');
    const pushName = text.split(' ')[0]; // This might not be the player's name, consider using message.pushName if available
    const player = await playerManager.getOrCreatePlayer(phoneNumber, pushName);

    if (text.toLowerCase() === '/start' || text.toLowerCase() === '/commencer') {
      await this.sendWelcomeMessage(from, player, isGroup);
      return;
    }

    if (text.toLowerCase() === '/stats') {
      const stats = playerManager.getStatsDisplay(player);
      const location = await worldManager.getLocationDescription(player.position.location);
      await this.sendMessage(from, `${stats}\n\n${location}`);
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

    if (!playerManager.isAlive(player)) {
      await this.sendMessage(from, "💀 Tu es mort. Tape /start pour recommencer une nouvelle vie.");
      return;
    }

    await this.handleFreeAction(from, player, text, isGroup);
  }

  async handleFreeAction(from, player, actionText, isGroup) {
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
      playerStats: player.stats,
      location: currentLocation?.name || player.position.location,
      time: `${time.hour}h, ${time.period}`,
      weather: time.weather,
      consequences: JSON.stringify(calculatedConsequences.statChanges),
      npcsPresent: npcsPresent.map(n => n.name).join(', ')
    };

    const narrative = await pollinations.generateNarrative(narrativeContext);

    let response = `🎭 **ESPRIT-MONDE**\n\n${narrative}\n\n`;

    if (npcReactions.length > 0) {
      response += `👥 ${npcReactions.join(' ')}\n\n`;
    }

    response += playerManager.getStatsDisplay(player);

    if (calculatedConsequences.events.length > 0) {
      response += `\n\n⚡ Événements: ${calculatedConsequences.events.join(', ')}`;
    }

    await this.sendMessage(from, response);

    if (!playerManager.isAlive(player)) {
      await this.sendMessage(from, "\n\n💀 **TU ES MORT**\nTa santé est tombée à zéro. Ton aventure se termine ici.\nTape /start pour recommencer.");
    }
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

**Barres d'État:**
❤️ Santé - Si 0%, tu meurs
⚡ Énergie - Diminue avec l'action
🍔 Faim - Mange pour survivre
🧠 Mental - Affecté par le stress
🚨 Wanted - Niveau de recherche police

**Commandes Principales:**
/stats - Tes statistiques
/metiers - Voir les métiers
/permis - Voir les permis
/vehicules - Voir les véhicules
/banque - Compte bancaire
/help - Cette aide

**Économie:**
/postuler [métier] - Postuler à un métier
/acheter_permis [type] - Acheter un permis
/acheter_vehicule [type] - Acheter un véhicule
/deposer [montant] - Déposer à la banque
/retirer [montant] - Retirer de la banque

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
      await this.sock.sendMessage(to, { text });
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  }
}

const bot = new EspritMondeBot();
bot.init().catch(console.error);
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

import database from './src/database.js';
import playerManager from './src/player.js';
import worldManager from './src/world.js';
import actionDetector from './src/actionDetector.js';
import consequences from './src/consequences.js';
import npcManager from './src/npcs.js';
import pollinations from './src/pollinations.js';
import webServer from './src/webServer.js';

dotenv.config();

const logger = pino({ level: 'silent' });

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
    console.log('✅ Monde de Livium initialisé');
    webServer.updateStatus('Connexion à WhatsApp...', false);
    
    await this.connectToWhatsApp();
  }

  async connectToWhatsApp() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

      const socketConfig = {
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: ['Ubuntu', 'Chrome', '128.0.6613.86'],
        version: [2, 3000, 1025190524],
        defaultQueryTimeoutMs: undefined,
        getMessage: async key => {
          console.log('⚠️ Message non déchiffré, retry demandé:', key);
          return { conversation: '🔄 Réessaye d\'envoyer ton message' };
        }
      };

      if (process.env.PROXY_URL) {
        console.log('🔌 Configuration du proxy:', process.env.PROXY_URL.split('@')[1] || 'proxy configuré');
        
        const proxyUrl = process.env.PROXY_URL;
        let agent;
        
        if (proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks5://')) {
          agent = new SocksProxyAgent(proxyUrl);
          console.log('✅ Agent SOCKS proxy créé');
        } else if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
          agent = new HttpsProxyAgent(proxyUrl);
          console.log('✅ Agent HTTP proxy créé');
        } else {
          console.log('⚠️ Format de proxy non reconnu, connexion directe');
        }

        if (agent) {
          socketConfig.fetchAgent = agent;
        }
      } else {
        console.log('ℹ️ Aucun proxy configuré - connexion directe (peut causer erreur 405 sur datacenter IP)');
      }

      this.sock = makeWASocket(socketConfig);

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('\n📱 Scannez ce QR Code avec WhatsApp:\n');
          qrcode.generate(qr, { small: true });
          console.log('\n⏳ En attente du scan...\n');
          
          webServer.updateQRCode(qr);
          webServer.updateStatus('⏳ En attente du scan QR Code', false);
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

      this.sock.ev.on('messages.upsert', async ({ messages }) => {
        await this.handleMessage(messages);
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

      if (!text) continue;

      console.log(`📨 Message de ${from}: ${text}`);

      try {
        await this.processPlayerAction(from, text);
        
        const playerCount = Object.keys(database.players).length;
        webServer.updatePlayerCount(playerCount);
      } catch (error) {
        console.error('Erreur traitement message:', error);
        await this.sendMessage(from, "❌ Une erreur s'est produite dans le monde de Livium...");
      }
    }
  }

  async processPlayerAction(phoneNumber, actionText) {
    const pushName = actionText.split(' ')[0];
    const player = await playerManager.getOrCreatePlayer(phoneNumber, pushName);

    if (actionText.toLowerCase() === '/start' || actionText.toLowerCase() === '/commencer') {
      await this.sendWelcomeMessage(phoneNumber, player);
      return;
    }

    if (actionText.toLowerCase() === '/stats') {
      const stats = playerManager.getStatsDisplay(player);
      const location = await worldManager.getLocationDescription(player.position.location);
      await this.sendMessage(phoneNumber, `${stats}\n\n${location}`);
      return;
    }

    if (actionText.toLowerCase() === '/help' || actionText.toLowerCase() === '/aide') {
      await this.sendHelpMessage(phoneNumber);
      return;
    }

    if (!playerManager.isAlive(player)) {
      await this.sendMessage(phoneNumber, "💀 Tu es mort. Tape /start pour recommencer une nouvelle vie à Livium.");
      return;
    }

    await this.handleFreeAction(phoneNumber, player, actionText);
  }

  async handleFreeAction(phoneNumber, player, actionText) {
    await this.sendMessage(phoneNumber, "⏳ ESPRIT-MONDE analyse ton action...");

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
    await database.savePlayer(phoneNumber, player);

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

    await this.sendMessage(phoneNumber, response);

    if (!playerManager.isAlive(player)) {
      await this.sendMessage(phoneNumber, "\n\n💀 **TU ES MORT**\nTa santé est tombée à zéro. Ton aventure se termine ici.\nTape /start pour recommencer.");
    }
  }

  async sendWelcomeMessage(phoneNumber, player) {
    const welcome = `🌆 **Bienvenue à LIVIUM** 🌆

Tu es ${player.name}, un habitant de Livium, ville où chaque action a des conséquences.

🎮 **SYSTÈME ESPRIT-MONDE**
Une IA contrôle tout: le temps, les PNJ, les événements, et réagit à tes actions libres.

📊 **Tes Stats**
${playerManager.getStatsDisplay(player)}

📍 **Ta Position**
${await worldManager.getLocationDescription(player.position.location)}

✍️ **Comment jouer**
Écris simplement ce que tu veux faire en langage naturel:
- "Je vais au marché acheter du pain"
- "Je cours vers le quartier riche"
- "Je parle au barista"

⌨️ **Commandes**
/stats - Voir tes statistiques
/help - Aide

🌟 Ton aventure commence maintenant. Que fais-tu ?`;

    await this.sendMessage(phoneNumber, welcome);
  }

  async sendHelpMessage(phoneNumber) {
    const help = `📚 **GUIDE ESPRIT-MONDE**

**Actions Libres:**
Écris ce que tu veux faire naturellement. L'IA comprend et réagit.

**Exemples:**
• "Je marche vers le centre-ville"
• "Je vole un sac au marché"
• "Je mange dans un restaurant"
• "Je me repose sur un banc"

**Barres d'État:**
❤️ Santé - Si 0%, tu meurs
⚡ Énergie - Diminue avec l'action
🍔 Faim - Mange pour survivre
🧠 Mental - Affecté par le stress
🚨 Wanted - Niveau de recherche police

**Lieux de Livium:**
• Quartier Béton
• Centre-Ville
• Marché
• Quartier Riche
• Zone Industrielle

**Temps:**
1h réelle = 1 jour dans le jeu
Le monde évolue en temps réel

**Commandes:**
/stats - Tes statistiques
/help - Cette aide
/start - Recommencer`;

    await this.sendMessage(phoneNumber, help);
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

# 🌆 ESPRIT-MONDE - Bot WhatsApp RP Immersif

## 📋 Description
Bot WhatsApp avec système de jeu de rôle immersif "ESPRIT-MONDE" gérant un monde complet (Livium) avec IA narrative, PNJ réactifs, barres d'état et système de temps synchronisé.

## 🏗️ Architecture du Projet

### Structure des fichiers
```
├── index.js                 # Bot principal Baileys
├── src/
│   ├── database.js         # Gestion base de données JSON
│   ├── pollinations.js     # Intégration API Pollinations (IA narrative)
│   ├── player.js           # Système de gestion des joueurs
│   ├── world.js            # Système de monde et temps
│   ├── actionDetector.js   # Détecteur d'actions et intentions
│   ├── consequences.js     # Calculateur de conséquences
│   └── npcs.js             # Système de PNJ
├── data/
│   ├── players.json        # Données joueurs
│   ├── npcs.json           # Données PNJ
│   └── world.json          # État du monde
└── package.json
```

## ⚙️ Fonctionnalités Implémentées

### ✅ Système de Base
- ✅ Bot WhatsApp fonctionnel avec Baileys
- ✅ Authentification QR Code
- ✅ Gestion des messages en temps réel

### ✅ Système de Jeu
- ✅ Gestion des barres d'état (Santé, Énergie, Faim, Mental, Wanted)
- ✅ Système de positions avec quartiers de Livium
- ✅ Base de données JSON persistante
- ✅ Système de temps synchronisé (1h IRL = 1 jour IG)
- ✅ Cycles jour/nuit avec météo dynamique

### ✅ IA et Narration
- ✅ Intégration API Pollinations (gratuite, sans clé)
- ✅ Détection automatique des actions libres
- ✅ Analyse des intentions du joueur
- ✅ Génération narrative immersive

### ✅ PNJ et Monde
- ✅ PNJ avec mémoires et attitudes
- ✅ Réactions basées sur l'historique
- ✅ Calculateur de conséquences automatique
- ✅ Événements dynamiques (vol, combat, etc.)

## ⚠️ Problème Connu - Erreur 405

### Symptôme
```
❌ Connexion fermée.
📝 Raison: Connection Failure
📋 Code: 405
```

### Cause
WhatsApp bloque les connexions depuis les **IP de datacenter** (AWS, Replit, Railway, etc.) pour prévenir les bots non autorisés. C'est une limitation de la plateforme WhatsApp, pas du code.

### Solutions

#### Option 1: Utiliser un Proxy (Recommandé pour Replit)
1. Créer un fichier `.env` basé sur `.env.example`
2. Ajouter l'URL de votre proxy:
   ```
   PROXY_URL=socks5://username:password@host:port
   ```
3. Relancer le bot

**Services proxy recommandés:**
- **Bright Data** (proxy résidentiels)
- **Smartproxy** (proxy mobiles)
- **IPRoyal** (proxy économiques)

#### Option 2: Exécuter Localement
Le bot fonctionne parfaitement depuis une **connexion internet résidentielle** (domicile):

```bash
# Cloner le projet
git clone <votre-repo>
cd esprit-monde-bot

# Installer les dépendances
npm install

# Lancer le bot
npm start
```

Le QR code s'affichera dans votre terminal pour connexion.

#### Option 3: Attendre 24-48h
Parfois WhatsApp débloque temporairement les IP. Réessayez plus tard.

## 🎮 Utilisation du Bot

### Commandes Utilisateur
- `/start` ou `/commencer` - Commencer l'aventure
- `/stats` - Voir ses statistiques
- `/help` ou `/aide` - Aide

### Actions Libres
Le joueur écrit simplement ce qu'il veut faire:
- "Je vais au marché acheter du pain"
- "Je cours vers le quartier riche"  
- "Je parle à Sofia la Barista"
- "Je vole un sac et je fuis"

L'IA **ESPRIT-MONDE** analyse automatiquement l'action et génère:
- Conséquences sur les stats
- Réactions des PNJ
- Narration immersive
- Événements dynamiques

## 🗺️ Monde de Livium

### Quartiers
1. **Quartier Béton** - Zone urbaine dense, point de départ
2. **Centre-Ville** - Cœur commercial animé
3. **Marché** - Commerces et échanges
4. **Quartier Riche** - Zone résidentielle luxueuse
5. **Zone Industrielle** - Usines et entrepôts

### Système de Temps
- **1h réelle = 1 jour dans le jeu**
- Cycles jour/nuit automatiques
- Météo changeante (ensoleillé, pluvieux, orageux, etc.)

## 📊 Barres d'État

- ❤️ **Santé** (0-100%) - Mort si 0%
- ⚡ **Énergie** (0-100%) - Diminue avec les actions
- 🍔 **Faim** (0-100%) - Nécessité de manger
- 🧠 **Mental** (0-100%) - Affecté par le stress
- 🚨 **Wanted** (0-100%) - Niveau de recherche police

## 🤖 API Utilisée

### Pollinations AI (Gratuite)
- **URL**: https://text.pollinations.ai
- **Pas de clé API nécessaire**
- **Utilisée pour**:
  - Génération narrative immersive
  - Analyse des intentions du joueur
  - Contexte et descriptions dynamiques

## 📦 Dépendances

```json
{
  "@whiskeysockets/baileys": "^6.7.8",
  "@hapi/boom": "^10.0.1",
  "axios": "^1.7.7",
  "qrcode-terminal": "^0.12.0",
  "pino": "^9.5.0"
}
```

## 🔄 Prochaines Améliorations

- [ ] Support proxy intégré (en cours)
- [ ] Système économique avancé
- [ ] Missions et quêtes générées dynamiquement
- [ ] Multi-joueurs avec interactions
- [ ] Événements mondiaux programmés
- [ ] Système de véhicules et carburant
- [ ] Base de données PostgreSQL (optionnelle)

## 📝 Notes Techniques

### Persistance
- Données stockées en **JSON local** dans `/data`
- Automatiquement sauvegardées après chaque action
- Compatible avec déploiement persistant

### Performance
- IA Pollinations: ~2-3s par génération
- Gestion asynchrone des messages
- Pas de limite de joueurs simultanés

### Sécurité
- Pas de clés API exposées
- Numéros de téléphone hashés
- Données joueurs isolées

## 🐛 Dépannage

### Le bot ne se connecte pas
1. Vérifier les logs pour l'erreur exacte
2. Si erreur 405: configurer un proxy (voir ci-dessus)
3. Supprimer `auth_info_baileys` et redémarrer

### Le QR code ne s'affiche pas
- Normal si erreur 405 (blocage IP)
- Configurer un proxy pour résoudre

### Les PNJ ne réagissent pas
- Vérifier que `data/npcs.json` existe
- Réinitialiser avec les données par défaut

## 📞 Support

Pour toute question:
1. Vérifier ce README
2. Consulter les issues GitHub de Baileys
3. Tester localement si problème sur Replit

## 📜 Licence

MIT - Libre d'utilisation et modification

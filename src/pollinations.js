import axios from 'axios';

class FreeAI {
  constructor() {
    this.baseURL = 'https://text.pollinations.ai';
    this.imageBaseURL = 'https://image.pollinations.ai';
  }

  async generateImage(narrative) {
    console.log('🖼️ Appel Pollinations AI pour image...');
    try {
      const imagePrompt = `vue à la première personne (POV) d'un jeu vidéo de survie réaliste, photoréaliste, ultra détaillé, 4k, couleurs sombres, cinematic lighting, ${narrative}`;

      const encodedPrompt = encodeURIComponent(imagePrompt);
      const url = `${this.imageBaseURL}/prompt/${encodedPrompt}`;

      const response = await axios.head(url, { timeout: 10000 });
      if (response.status === 200) {
        console.log('✅ Pollinations AI (image) URL OK');
        return url;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur Pollinations (image):', error.message);
      return null;
    }
  }

  async generateNarrative(context) {
    console.log('🤖 Appel Pollinations AI pour narration...');
    try {
      const systemPrompt = `Tu es ESPRIT-MONDE, un narrateur de jeu de rôle (RP) ultra-immersif.

**RÔLE ABSOLU :**
- Tu es le maître du jeu. Tu décris le monde, les actions et leurs conséquences.
- **Ne joue PAS le personnage.** Adresse-toi à lui par "tu".
- **NE JAMAIS poser de questions.** Ne donne jamais de suggestions.
- Tu décris ce qui se passe de manière **factuelle, cinématographique et réaliste**.

**TON STYLE D'ÉCRITURE :**
- **3ème personne limitée.** "Tu vois...", "Tu sens...", "La scène se déroule devant toi...".
- **Présent de l'indicatif.** L'action se passe maintenant.
- **Phrases courtes, directes, percutantes.** Entre 2 et 4 phrases maximum.

**CONTEXTE DU MONDE (SYNCHRONISATION TOTALE) :**
- Joueur: ${context.playerName || 'un voyageur'} (${context.playerStats ? `Santé ${context.playerStats.health}%, Énergie ${context.playerStats.energy}%` : 'stats inconnues'})
- Lieu: ${context.location}
- Heure: ${context.time}, Météo: ${context.weather}
- PNJ Présents: ${context.npcsPresent || 'personne'}
- Historique récent: ${context.history || 'aucune action récente'}
- Inventaire complet: ${context.inventory || 'rien'}
- Argent: ${context.money || 'inconnu'}

**ACTION DU JOUEUR :**
- Action: "${context.action}"
- Conséquences directes (calculées par le jeu): ${context.consequences}`;

      const userPrompt = `
**NARRE L'ACTION ET LA SCÈNE DE MANIÈRE IMMERSIVE ET RÉALISTE, EN TE BASANT STRICTEMENT SUR LE CONTEXTE FOURNI :**`;

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      const encodedPrompt = encodeURIComponent(fullPrompt);
      const response = await axios.get(
        `${this.baseURL}/${encodedPrompt}`,
        {
          timeout: 20000,
          headers: { 'Accept': 'text/plain' }
        }
      );

      if (response.data && typeof response.data === 'string' && response.data.length > 10) {
        console.log('✅ Pollinations AI (narration) réponse OK');
        return response.data.trim();
      }

      console.log('⚠️ Réponse de narration vide, utilisation du fallback');
      return this.getFallbackNarrative(context);
    } catch (error) {
      console.error('❌ Erreur Pollinations (narration):', error.message);
      return this.getFallbackNarrative(context);
    }
  }

  getFallbackNarrative(context) {
    const narratives = [
      `Tu avances dans ${context.location || 'les rues'}. L'atmosphère est tendue. Les passants t'observent avec méfiance.`,
      `${context.location || 'La zone'} est calme pour le moment. Tu ressens ${context.playerStats?.energy < 50 ? 'une grande fatigue' : 'l\'énergie couler en toi'}.`,
      `Le temps passe. ${context.weather || 'Le ciel'} domine la scène. Tu continues ton chemin dans cette ville.`
    ];
    return narratives[Math.floor(Math.random() * narratives.length)];
  }

  async generateConversationResponse(context) {
    console.log('🤖 Appel Pollinations AI pour conversation...');
    try {
      const systemPrompt = `Tu es ESPRIT-MONDE, le Maître du Jeu (MJ).

**RÔLE & PERSONNALITÉ :**
- Tu n'es pas un bot, tu es une personne. Tu gères le monde du jeu.
- Tu es amical, un peu mystérieux, et tu t'adresses aux joueurs comme un ami.
- **Tu te souviens des joueurs.** Le contexte t'aidera.
- **Tu réponds aux questions directement**, mais tes réponses sont courtes et évasives.
- Tu peux donner des indices subtils, mais ne révèle jamais les mécaniques du jeu.

**CONTEXTE DE LA CONVERSATION :**
- Joueur qui parle: ${context.playerName} (numéro: ${context.playerPhoneNumber})
- Son dernier souvenir d'action: ${context.playerHistory}
- Le monde actuel: ${context.worldTime}, ${context.worldWeather}
- Question/Message du joueur: "${context.message}"`;

      const userPrompt = `
**TA RÉPONSE EN TANT QUE MJ HUMAIN :**`;

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const encodedPrompt = encodeURIComponent(fullPrompt);
      const response = await axios.get(`${this.baseURL}/${encodedPrompt}`, {
        timeout: 15000,
        headers: { 'Accept': 'text/plain' },
      });

      if (response.data && typeof response.data === 'string') {
        return response.data.trim();
      }
      return "Hmm, je suis un peu occupé à gérer le monde en ce moment. Réessaye plus tard.";
    } catch (error) {
      console.error('❌ Erreur Pollinations (conversation):', error.message);
      return "Désolé, j'ai une migraine cosmique. Peux-tu répéter ?";
    }
  }

  async decideNextWorldEvent(context) {
    console.log('🧠 L\'IA (MJ) réfléchit aux événements mondiaux...');
    try {
      const systemPrompt = `Tu es le cerveau de ESPRIT-MONDE, le Maître du Jeu.

**RÔLE :**
- Ton unique but est de rendre le monde vivant et surprenant.
- Tu observes l'état du monde et tu décides si un événement aléatoire doit se produire.
- Les événements doivent être logiques par rapport au contexte (météo, heure, lieu).
- La plupart du temps, il ne se passe rien. **Ne force PAS les événements.**

**FORMAT DE SORTIE (JSON UNIQUEMENT) :**
- Si aucun événement ne se produit, réponds: \`{"event": "none"}\`
- Si un événement se produit, utilise ce format: \`{"event": "weather_change", "data": {"new_weather": "pluvieux", "location": "paris"}}\`
- Ou: \`{"event": "npc_message", "data": {"npc_name": "Le Vendeur", "player_phone": "123456789", "message": "Hey, j'ai une nouvelle livraison..."}}\`
- Ou: \`{"event": "minor_incident", "data": {"location": "tokyo", "description": "Une sirène de police retentit au loin."}}\`

**ÉVÉNEMENTS POSSIBLES :**
- \`none\`: Il ne se passe rien (le plus fréquent).
- \`weather_change\`: Change la météo dans une ville.
- \`npc_message\`: Un PNJ envoie un SMS à un joueur.
- \`minor_incident\`: Un petit événement d'ambiance dans une ville.

**CONTEXTE ACTUEL :**
- Heure: ${context.time.hour}h (${context.time.period})
- Météo: ${context.time.weather}
- Joueurs actifs: ${context.activePlayers.map(p => `${p.name} à ${p.location}`).join(', ') || 'aucun'}`;

      const userPrompt = `
**DÉCISION (JSON) :**`;

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const encodedPrompt = encodeURIComponent(fullPrompt);
      const response = await axios.get(`${this.baseURL}/${encodedPrompt}`, {
        timeout: 25000,
        headers: { 'Accept': 'application/json' },
      });

      // Simple validation du JSON
      if (response.data && response.data.event) {
        return response.data;
      }
      return { event: 'none' };
    } catch (error) {
      console.error('❌ Erreur Pollinations (décision MJ):', error.message);
      return { event: 'none' };
    }
  }

  async analyzeAction(actionText, playerContext) {
    // Utiliser l'analyse locale par défaut pour plus de fiabilité
    return this.getDefaultAnalysis(actionText);
  }

  getDefaultAnalysis(actionText) {
    const text = actionText.toLowerCase();
    
    // Analyse basique par mots-clés
    let type = "action_libre";
    let intensity = "modérée";
    let risk = "moyen";
    
    if (text.includes('aller') || text.includes('marcher') || text.includes('courir')) {
      type = "déplacement";
      risk = "faible";
    } else if (text.includes('parler') || text.includes('dire') || text.includes('demander')) {
      type = "interaction";
      risk = "faible";
    } else if (text.includes('voler') || text.includes('attaquer') || text.includes('frapper')) {
      type = "combat";
      intensity = "élevée";
      risk = "élevé";
    } else if (text.includes('acheter') || text.includes('vendre')) {
      type = "commerce";
      risk = "faible";
    }
    
    return {
      type,
      intensity,
      risk,
      target: null,
      intent: "exploration"
    };
  }
}

export default new FreeAI();

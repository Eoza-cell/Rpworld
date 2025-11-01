import axios from 'axios';

class FreeAI {
  constructor() {
    // API Pollinations - gratuite, sans clé API
    this.baseURL = 'https://text.pollinations.ai';
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

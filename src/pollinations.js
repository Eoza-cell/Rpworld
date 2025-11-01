import axios from 'axios';

class FreeAI {
  constructor() {
    // API Pollinations - gratuite, sans clé API
    this.baseURL = 'https://text.pollinations.ai';
  }

  async generateNarrative(context) {
    console.log('🤖 Appel Pollinations AI...');
    try {
      const systemPrompt = `Tu es ESPRIT-MONDE, narrateur RP immersif.

RÔLE: Narrateur du monde, pas assistant. Décris les conséquences des actions de manière réaliste. Fais vivre les PNJ et l'environnement. Ne pose JAMAIS de questions.

STYLE: Narratif, présent, 3-4 phrases courtes et percutantes. Pas de questions ni suggestions.

CONTEXTE:
${context.playerStats ? `Stats: Santé ${context.playerStats.health}%, Énergie ${context.playerStats.energy}%, Faim ${context.playerStats.hunger}%, Mental ${context.playerStats.mental}%, Wanted ${context.playerStats.wanted}%` : ''}
${context.location ? `Lieu: ${context.location}` : ''}
${context.time ? `${context.time}` : ''}
${context.weather ? `Météo: ${context.weather}` : ''}`;

      const userPrompt = `${context.action ? `Action: ${context.action}` : ''}
${context.consequences ? `Conséquences: ${context.consequences}` : ''}
${context.npcsPresent ? `PNJ: ${context.npcsPresent}` : ''}

Narration immersive:`;

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      // Utiliser l'endpoint GET de Pollinations (plus fiable)
      const encodedPrompt = encodeURIComponent(fullPrompt);
      const response = await axios.get(
        `${this.baseURL}/${encodedPrompt}`,
        {
          timeout: 20000,
          headers: {
            'Accept': 'text/plain'
          }
        }
      );

      if (response.data && typeof response.data === 'string' && response.data.length > 20) {
        console.log('✅ Pollinations AI réponse OK');
        return response.data.trim();
      }

      console.log('⚠️ Réponse vide, utilisation du fallback');
      return this.getFallbackNarrative(context);
    } catch (error) {
      console.error('❌ Erreur Pollinations:', error.message);
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

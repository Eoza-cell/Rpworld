import axios from 'axios';

class FreeAI {
  constructor() {
    // API gratuite sans clé - DuckDuckGo AI Chat
    this.baseURL = 'https://duckduckgo.com/duckchat/v1/chat';
    this.backupURL = 'https://text.pollinations.ai';
  }

  async generateNarrative(context) {
    console.log('🤖 Appel IA gratuite pour generateNarrative...');
    try {
      const systemPrompt = `Tu es ESPRIT-MONDE, une IA de jeu de rôle immersif qui contrôle tout le monde de Livium.

RÔLE:
- Tu es le narrateur du monde, pas un assistant
- Tu décris les conséquences des actions du joueur de manière réaliste et immersive
- Tu fais vivre les PNJ, l'environnement, les événements
- Tu ne poses JAMAIS de questions au joueur
- Tu décris ce qui arrive, point final

STYLE:
- Narratif, descriptif, immersif
- Présent de l'indicatif
- Focalisation sur les sensations, détails concrets
- Maximum 4-5 phrases courtes et percutantes
- Pas de questions, pas de suggestions

INFOS CONTEXTUELLES:
${context.playerStats ? `Stats joueur: Santé ${context.playerStats.health}%, Énergie ${context.playerStats.energy}%, Faim ${context.playerStats.hunger}%, Mental ${context.playerStats.mental}%, Wanted ${context.playerStats.wanted}%` : ''}
${context.location ? `Lieu: ${context.location}` : ''}
${context.time ? `Heure: ${context.time}` : ''}
${context.weather ? `Météo: ${context.weather}` : ''}`;

      const userPrompt = `${context.action ? `Action du joueur: ${context.action}` : ''}
${context.consequences ? `Conséquences calculées: ${context.consequences}` : ''}
${context.npcsPresent ? `PNJ présents: ${context.npcsPresent}` : ''}

Génère une narration immersive décrivant ce qui se passe maintenant.`;

      // Essai avec Pollinations (mise à jour de l'URL)
      try {
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const response = await axios.post(
          this.backupURL,
          fullPrompt,
          {
            headers: {
              'Content-Type': 'text/plain'
            },
            timeout: 15000
          }
        );

        if (response.data && response.data.length > 10) {
          console.log('✅ IA réponse reçue');
          return response.data;
        }
      } catch (pollinationsError) {
        console.log('⚠️ Pollinations indisponible, utilisation du fallback');
      }

      // Fallback
      return this.getFallbackNarrative(context);
    } catch (error) {
      console.error('❌ Erreur API IA:', error.message);
      return this.getFallbackNarrative(context);
    }
  }

  getFallbackNarrative(context) {
    const narratives = [
      `Tu avances dans ${context.location || 'les rues de Livium'}. L'atmosphère est tendue. Les passants t'observent avec méfiance.`,
      `${context.location || 'La zone'} est calme pour le moment. Tu ressens ${context.playerStats?.energy < 50 ? 'une grande fatigue' : 'l\'énergie couler en toi'}.`,
      `Le temps passe. ${context.weather || 'Le ciel'} domine la scène. Tu continues ton chemin dans Livium.`
    ];
    return narratives[Math.floor(Math.random() * narratives.length)];
  }

  async analyzeAction(actionText, playerContext) {
    try {
      const systemPrompt = `Tu es un analyseur d'actions pour un jeu RP. Analyse l'action du joueur et extrais:
1. Type d'action (déplacement, interaction, combat, vol, commerce, etc.)
2. Intensité (faible, modérée, élevée, extrême)
3. Risque (aucun, faible, moyen, élevé, critique)
4. Cible éventuelle
5. Intention du joueur

Réponds UNIQUEMENT en format JSON sans markdown:
{
  "type": "type d'action",
  "intensity": "intensité",
  "risk": "risque",
  "target": "cible ou null",
  "intent": "intention principale"
}`;

      const response = await axios.post(
        this.backupURL,
        `${systemPrompt}\n\nAction: ${actionText}`,
        {
          headers: {
            'Content-Type': 'text/plain'
          },
          timeout: 15000
        }
      );

      try {
        const cleaned = response.data.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
      } catch {
        return this.getDefaultAnalysis(actionText);
      }
    } catch (error) {
      console.error('Erreur analyse action:', error.message);
      return this.getDefaultAnalysis(actionText);
    }
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

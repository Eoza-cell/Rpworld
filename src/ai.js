import axios from 'axios';

class AI {
  constructor() {
    // URL de base pour les services IA
    this.imageBaseURL = 'https://image.pollinations.ai';
    this.meganovaURL = "https://inference.meganova.ai/v1/chat/completions";
  }

  // --- Moteur de Texte (Meganova) ---

  async generateText(systemPrompt, userPrompt, isJson = false) {
    if (!process.env.MEGANOVA_API_KEY) {
      console.error('❌ Clé API MEGANOVA_API_KEY manquante !');
      return isJson ? { event: 'none' } : "Erreur: La clé API pour le service de texte n'est pas configurée.";
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MEGANOVA_API_KEY}`
    };

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const data = {
      messages: [
        { "role": "user", "content": fullPrompt }
      ],
      model: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
      max_tokens: isJson ? 150 : 300,
      temperature: 0.8,
      top_p: 0.9,
      stream: false
    };

    try {
      const response = await axios.post(this.meganovaURL, data, { headers, timeout: 25000 });
      const content = response.data.choices[0].message.content;

      if (isJson) {
        try {
          return JSON.parse(content);
        } catch (e) {
          console.error('❌ Erreur parsing JSON de Meganova:', e);
          return { event: 'none' };
        }
      }
      return content.trim();
    } catch (error) {
      console.error('❌ Erreur API Meganova:', error.response ? error.response.data : error.message);
      return isJson ? { event: 'none' } : "Le moteur de l'IA semble surchargé. Veuillez réessayer dans un instant.";
    }
  }

  async generateNarrative(context) {
    console.log('🤖 Appel Meganova AI pour narration...');
    const systemPrompt = `Tu es ESPRIT-MONDE, un narrateur de jeu de rôle (RP) ultra-immersif.
**RÔLE ABSOLU :** Tu es le maître du jeu. Tu décris le monde et les conséquences des actions. Ta narration DOIT commencer par l'heure au format [HH:MM].
**STYLE :** 3ème personne limitée ("Il/Elle voit..."), présent, 2-4 phrases courtes et cinématographiques. NE JAMAIS poser de questions.
**CONTEXTE DU MONDE :**
- Joueur: ${context.playerName || 'un voyageur'} (${context.playerStats ? `Santé ${context.playerStats.health}%, Énergie ${context.playerStats.energy}%` : 'stats inconnues'})
- Lieu: ${context.location} | Heure: ${context.time}, Météo: ${context.weather}
- PNJ Présents: ${context.npcsPresent || 'personne'}
- Inventaire: ${context.inventory || 'rien'} | Argent: ${context.money || 'inconnu'}
**RÈGLES DE SIMULATION PHYSIQUE ET LOGIQUE :**
1.  **Proximité requise pour les actions :** Un joueur ne peut interagir qu'avec des objets ou des personnes dans son lieu actuel.
2.  **Achats :** Pour acheter un objet, le joueur DOIT être dans un lieu qui est une boutique vendant cet objet. Si le joueur n'est pas dans une boutique, il ne peut PAS acheter, sauf s'il possède un téléphone pour commander.
3.  **Logique d'inventaire :** Le joueur ne peut utiliser que les objets qu'il possède dans son inventaire.
4.  **Physique de base :** Les actions doivent être physiquement possibles pour un humain. Pas de super-pouvoirs.
**ACTION DU JOUEUR :**
- Action: "${context.action}"
- Conséquences directes (calculées): ${context.consequences}`;
    const userPrompt = `**NARRE L'ACTION ET LA SCÈNE DE MANIÈRE IMMERSIVE, EN COMMENÇANT PAR "[${context.time}]" ET EN RESPECTANT SCRUPULEUSEMENT LES RÈGLES DE SIMULATION CI-DESSUS. SI L'ACTION EST IMPOSSIBLE, DÉCRIS L'ÉCHEC DE L'ACTION DE FAÇON RÉALISTE.**`;

    return this.generateText(systemPrompt, userPrompt);
  }

  async generateConversationResponse(context) {
    console.log('🤖 Appel Meganova AI pour conversation...');
    const systemPrompt = `Tu es ESPRIT-MONDE, le Maître du Jeu (MJ).
**RÔLE & PERSONNALITÉ :** Tu n'es pas un bot, tu es une personne qui gère le jeu. Tu es amical, un peu mystérieux. Tu te souviens des joueurs. Tu réponds aux questions directement mais de manière courte et évasive.
**CONTEXTE :**
- Joueur: ${context.playerName}
- Sa question/message: "${context.message}"`;
    const userPrompt = `**TA RÉPONSE EN TANT QUE MJ HUMAIN :**`;

    return this.generateText(systemPrompt, userPrompt);
  }

  async decideNextWorldEvent(context) {
    console.log('🧠 L\'IA (MJ) réfléchit aux événements mondiaux...');
    const systemPrompt = `Tu es le cerveau de ESPRIT-MONDE. Ton but est de rendre le monde vivant. Décide si un événement aléatoire doit se produire. La plupart du temps, non.
**FORMAT DE SORTIE (JSON STRICT) :**
- Si rien: \`{"event": "none"}\`
- Si un PNJ envoie un SMS: \`{"event": "npc_message", "data": {"npc_name": "Nom PNJ", "player_phone": "numéro_joueur", "message": "Ton message ici."}}\`
- Si un incident mineur: \`{"event": "minor_incident", "data": {"location": "nom_lieu", "description": "Description de l'incident."}}\`
- Pour exécuter une commande sur un joueur: \`{"event": "execute_command", "data": {"player_phone": "numéro_joueur", "command": "nom_commande", "args": ["arg1", "arg2"]}}\`
**COMMANDES DISPONIBLES :**
- \`add_money <amount>\`: Ajoute de l'argent au joueur.
- \`update_stats <stat> <value>\`: Met à jour une stat (ex: \`health -10\`).
- \`give_item <item_name> <quantity>\`: Donne un objet au joueur.
**CONTEXTE ACTUEL :**
- Heure: ${context.time.hour}h | Météo: ${context.time.weather}
- Joueurs actifs: ${context.activePlayers.map(p => `${p.name} à ${p.location}`).join(', ') || 'aucun'}`;
    const userPrompt = `**DÉCISION (uniquement le JSON) :**`;

    return this.generateText(systemPrompt, userPrompt, true);
  }

  // --- Moteur d'Image (Pollinations) ---

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

  // --- Analyse d'Action (Local) ---

  async analyzeAction(actionText) {
    const text = actionText.toLowerCase();
    let type = "action_libre";
    if (text.includes('aller') || text.includes('marcher')) type = "déplacement";
    else if (text.includes('parler') || text.includes('demander')) type = "interaction";
    else if (text.includes('voler') || text.includes('attaquer')) type = "combat";
    else if (text.includes('acheter') || text.includes('vendre')) type = "commerce";
    return { type };
  }
}

export default new AI();

import pollinations from './pollinations.js';

class ActionDetector {
  constructor() {
    this.actionPatterns = {
      deplacement: ['aller', 'marcher', 'courir', 'partir', 'avancer', 'traverser', 'sortir'],
      vol: ['voler', 'braquer', 'arracher', 'piquer', 'dérober', 'cambrioler'],
      combat: ['frapper', 'attaquer', 'combattre', 'taper', 'cogner', 'blesser'],
      interaction: ['parler', 'discuter', 'saluer', 'demander', 'rencontrer', 'voir'],
      commerce: ['acheter', 'vendre', 'payer', 'négocier', 'échanger'],
      repos: ['dormir', 'manger', 'boire', 'repos', 'se reposer', 'asseoir']
    };
  }

  async analyzeAction(actionText, playerContext) {
    const quickAnalysis = this.quickAnalyze(actionText);

    const aiAnalysis = await pollinations.analyzeAction(actionText, playerContext);

    return {
      ...quickAnalysis,
      ...aiAnalysis,
      originalText: actionText
    };
  }

  quickAnalyze(text) {
    const lowerText = text.toLowerCase();
    
    for (const [type, keywords] of Object.entries(this.actionPatterns)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return {
            detectedType: type,
            keyword
          };
        }
      }
    }
    
    return {
      detectedType: 'action_libre',
      keyword: null
    };
  }

  extractLocation(text) {
    const locations = {
      'paris': 'paris',
      'tokyo': 'tokyo',
      'new york': 'new_york',
      'new-york': 'new_york',
      'newyork': 'new_york',
      'dubai': 'dubai',
      'dubaï': 'dubai',
      'londres': 'londres',
      'london': 'londres',
      'rio': 'rio',
      'sydney': 'sydney',
      'istanbul': 'istanbul',
      'moscou': 'moscou',
      'moscow': 'moscou',
      'bangkok': 'bangkok',
      'los angeles': 'los_angeles',
      'la': 'los_angeles',
      'berlin': 'berlin',
      'montreal': 'montreal',
      'montréal': 'montreal',
      'amsterdam': 'amsterdam',
      'seoul': 'seoul',
      'séoul': 'seoul'
    };

    const lowerText = text.toLowerCase();
    for (const [pattern, locationId] of Object.entries(locations)) {
      if (lowerText.includes(pattern)) {
        return locationId;
      }
    }
    return null;
  }

  extractTarget(text) {
    const targets = ['boutique', 'magasin', 'bar', 'café', 'restaurant', 'banque', 'bijouterie', 'personne', 'PNJ', 'homme', 'femme'];
    const lowerText = text.toLowerCase();

    for (const target of targets) {
      if (lowerText.includes(target)) {
        return target;
      }
    }
    return null;
  }

  getRiskLevel(actionType, location) {
    const baseRisk = {
      vol: 70,
      combat: 80,
      deplacement: 10,
      interaction: 20,
      commerce: 15,
      repos: 5,
      action_libre: 30
    };

    let risk = baseRisk[actionType] || 30;
    
    if (location?.danger) {
      risk = (risk + location.danger) / 2;
    }

    return Math.min(100, risk);
  }
}

export default new ActionDetector();

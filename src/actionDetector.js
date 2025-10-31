import pollinations from './pollinations.js';

class ActionDetector {
  constructor() {
    this.actionPatterns = {
      deplacement: {
        keywords: ['aller', 'marcher', 'courir', 'partir', 'avancer', 'traverser', 'sortir', 'voyager', 'se rendre'],
        target: 'location'
      },
      vol: {
        keywords: ['voler', 'braquer', 'arracher', 'piquer', 'dérober', 'cambrioler', 'détrousser'],
        target: 'personne'
      },
      combat: {
        keywords: ['frapper', 'attaquer', 'combattre', 'taper', 'cogner', 'blesser', 'menacer', 'provoquer'],
        target: 'personne'
      },
      interaction: {
        keywords: ['parler', 'discuter', 'saluer', 'demander', 'rencontrer', 'voir', 'interroger', 'draguer'],
        target: 'personne'
      },
      commerce: {
        keywords: ['acheter', 'vendre', 'payer', 'négocier', 'échanger', 'commander', 'louer'],
        target: 'boutique'
      },
      repos: {
        keywords: ['dormir', 'manger', 'boire', 'repos', 'se reposer', 'asseoir', 's\'allonger'],
        target: 'lieu'
      }
    };
  }

  async analyzeAction(actionText, playerContext) {
    const quickAnalysis = this.quickAnalyze(actionText);
    const aiAnalysis = await pollinations.analyzeAction(actionText, playerContext);

    const combinedAnalysis = {
      ...aiAnalysis, // AI analysis provides the base
      ...quickAnalysis, // Quick analysis provides more specific keywords and types
      target: this.extractTarget(actionText, quickAnalysis.detectedType) || aiAnalysis.target,
      risk: this.getRiskLevel(quickAnalysis.detectedType, playerContext.location),
      originalText: actionText
    };

    return combinedAnalysis;
  }

  quickAnalyze(text) {
    const lowerText = text.toLowerCase();
    
    for (const [type, data] of Object.entries(this.actionPatterns)) {
      for (const keyword of data.keywords) {
        if (lowerText.includes(keyword)) {
          return {
            detectedType: type,
            keyword,
            targetType: data.target
          };
        }
      }
    }
    
    return {
      detectedType: 'action_libre',
      keyword: null,
      targetType: 'none'
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

  extractTarget(text, actionType) {
    const lowerText = text.toLowerCase();
    let potentialTargets = [];

    if (actionType === 'commerce') {
      potentialTargets = ['boutique', 'magasin', 'supermarché', 'bar', 'café', 'restaurant'];
    } else if (['vol', 'combat', 'interaction'].includes(actionType)) {
      potentialTargets = ['personne', 'pnj', 'homme', 'femme', 'garde', 'policier', 'vendeur'];
    } else if (actionType === 'deplacement') {
      return this.extractLocation(text);
    }

    for (const target of potentialTargets) {
      if (lowerText.includes(target)) {
        return target;
      }
    }

    // Extraction de nom propre (simple)
    const words = text.split(' ');
    const capitalizedWord = words.find(w => w.length > 2 && w[0] === w[0].toUpperCase() && w.slice(1) === w.slice(1).toLowerCase());
    if (capitalizedWord) return capitalizedWord;

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

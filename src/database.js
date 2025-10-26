import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

class Database {
  constructor() {
    this.players = null;
    this.npcs = null;
    this.world = null;
  }

  async init() {
    await this.ensureDataFiles();
    await this.loadAll();
  }

  async ensureDataFiles() {
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }

    const defaultData = {
      'players.json': {},
      'npcs.json': {
        "npc_1": {
          "id": "npc_1",
          "name": "Jean le Barista",
          "location": "paris",
          "personality": "amical, bavard, typiquement parisien",
          "attitude": 70,
          "memory": []
        },
        "npc_2": {
          "id": "npc_2",
          "name": "Yuki la Guide",
          "location": "tokyo",
          "personality": "polie, serviable, traditionnelle",
          "attitude": 80,
          "memory": []
        },
        "npc_3": {
          "id": "npc_3",
          "name": "Officer Smith",
          "location": "new_york",
          "personality": "sévère, vigilant, américain",
          "attitude": 30,
          "memory": []
        },
        "npc_4": {
          "id": "npc_4",
          "name": "Ahmed le Commerçant",
          "location": "dubai",
          "personality": "riche, généreux, businessman",
          "attitude": 60,
          "memory": []
        }
      },
      'world.json': {
        "time": {
          "startTime": null,
          "currentDay": 1,
          "currentHour": 8,
          "weatherCondition": "ensoleillé"
        },
        "locations": {
          "paris": {
            "name": "Paris, France",
            "description": "La Ville Lumière - Tour Eiffel, Champs-Élysées, cafés parisiens et monuments historiques",
            "danger": 25,
            "police": 70
          },
          "tokyo": {
            "name": "Tokyo, Japon",
            "description": "Métropole futuriste - Shibuya, néons, temples traditionnels et gratte-ciels",
            "danger": 15,
            "police": 85
          },
          "new_york": {
            "name": "New York, USA",
            "description": "La ville qui ne dort jamais - Times Square, Central Park, buildings emblématiques",
            "danger": 40,
            "police": 65
          },
          "dubai": {
            "name": "Dubai, UAE",
            "description": "Ville du luxe - Burj Khalifa, centres commerciaux géants, plages dorées",
            "danger": 10,
            "police": 90
          },
          "londres": {
            "name": "Londres, UK",
            "description": "Capitale britannique - Big Ben, Tower Bridge, pubs anglais et palais royaux",
            "danger": 20,
            "police": 75
          },
          "rio": {
            "name": "Rio de Janeiro, Brésil",
            "description": "Ville festive - Christ Rédempteur, plages de Copacabana et Ipanema, favelas",
            "danger": 60,
            "police": 45
          },
          "sydney": {
            "name": "Sydney, Australie",
            "description": "Perle du Pacifique - Opéra, Harbour Bridge, plages de Bondi Beach",
            "danger": 15,
            "police": 80
          },
          "istanbul": {
            "name": "Istanbul, Turquie",
            "description": "Pont entre Orient et Occident - mosquées, Grand Bazar, Bosphore",
            "danger": 35,
            "police": 60
          },
          "moscou": {
            "name": "Moscou, Russie",
            "description": "Capitale russe - Place Rouge, Kremlin, cathédrales et architecture soviétique",
            "danger": 45,
            "police": 70
          },
          "bangkok": {
            "name": "Bangkok, Thaïlande",
            "description": "Ville des Anges - temples dorés, marchés flottants, street food et tuk-tuks",
            "danger": 30,
            "police": 55
          },
          "los_angeles": {
            "name": "Los Angeles, USA",
            "description": "Cité des Anges - Hollywood, Venice Beach, palmiers et vie de star",
            "danger": 50,
            "police": 60
          },
          "berlin": {
            "name": "Berlin, Allemagne",
            "description": "Capitale culturelle - Porte de Brandebourg, street art, clubs underground",
            "danger": 25,
            "police": 75
          },
          "montreal": {
            "name": "Montréal, Canada",
            "description": "Métropole bilingue - Vieux-Montréal, festivals, poutine et culture québécoise",
            "danger": 20,
            "police": 70
          },
          "amsterdam": {
            "name": "Amsterdam, Pays-Bas",
            "description": "Ville des canaux - vélos, coffee shops, musées et architecture hollandaise",
            "danger": 20,
            "police": 75
          },
          "seoul": {
            "name": "Séoul, Corée du Sud",
            "description": "Mégapole high-tech - K-pop, palais royaux, street food et gratte-ciels modernes",
            "danger": 15,
            "police": 85
          }
        }
      }
    };

    for (const [file, data] of Object.entries(defaultData)) {
      const filePath = join(DATA_DIR, file);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      }
    }
  }

  async loadAll() {
    this.players = await this.load('players.json');
    this.npcs = await this.load('npcs.json');
    this.world = await this.load('world.json');
  }

  async load(filename) {
    try {
      const data = await fs.readFile(join(DATA_DIR, filename), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Erreur chargement ${filename}:`, error);
      return {};
    }
  }

  async save(filename, data) {
    try {
      await fs.writeFile(join(DATA_DIR, filename), JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Erreur sauvegarde ${filename}:`, error);
      return false;
    }
  }

  async getPlayer(phoneNumber) {
    return this.players[phoneNumber] || null;
  }

  async savePlayer(phoneNumber, playerData) {
    this.players[phoneNumber] = playerData;
    await this.save('players.json', this.players);
  }

  async getNPCs() {
    return this.npcs;
  }

  async saveNPCs(npcsData) {
    this.npcs = npcsData;
    await this.save('npcs.json', this.npcs);
  }

  async getWorld() {
    return this.world;
  }

  async saveWorld(worldData) {
    this.world = worldData;
    await this.save('world.json', this.world);
  }
}

export default new Database();

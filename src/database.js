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
          "name": "Marcus le Dealer",
          "location": "quartier_beton",
          "personality": "méfiant, opportuniste",
          "attitude": 50,
          "memory": []
        },
        "npc_2": {
          "id": "npc_2",
          "name": "Sofia la Barista",
          "location": "centre_ville",
          "personality": "amicale, bavarde",
          "attitude": 70,
          "memory": []
        },
        "npc_3": {
          "id": "npc_3",
          "name": "Officer Durand",
          "location": "centre_ville",
          "personality": "sévère, vigilant",
          "attitude": 30,
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
          "quartier_beton": {
            "name": "Quartier Béton",
            "description": "Zone urbaine dense avec immeubles délabrés",
            "danger": 60,
            "police": 30
          },
          "quartier_riche": {
            "name": "Quartier Riche",
            "description": "Zone résidentielle luxueuse avec villas et jardins",
            "danger": 10,
            "police": 80
          },
          "zone_industrielle": {
            "name": "Zone Industrielle",
            "description": "Usines et entrepôts abandonnés",
            "danger": 70,
            "police": 20
          },
          "centre_ville": {
            "name": "Centre-Ville",
            "description": "Cœur commercial animé de Livium",
            "danger": 30,
            "police": 60
          },
          "marche": {
            "name": "Marché",
            "description": "Marché local avec échoppes et vendeurs",
            "danger": 40,
            "police": 50
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

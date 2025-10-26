import database from './database.js';

class WorldManager {
  constructor() {
    this.TIME_RATIO = 24;
    this.weatherTypes = ['ensoleillé', 'nuageux', 'pluvieux', 'orageux', 'brumeux'];
  }

  async init() {
    const world = await database.getWorld();
    if (!world.time.startTime) {
      world.time.startTime = Date.now();
      await database.saveWorld(world);
    }
    this.startTimeUpdater();
  }

  startTimeUpdater() {
    setInterval(async () => {
      await this.updateTime();
    }, 60000);
  }

  async updateTime() {
    const world = await database.getWorld();
    const elapsed = Date.now() - world.time.startTime;
    const hoursElapsed = Math.floor(elapsed / (3600000 / this.TIME_RATIO));

    world.time.currentDay = Math.floor(hoursElapsed / 24) + 1;
    world.time.currentHour = hoursElapsed % 24;

    if (Math.random() < 0.1) {
      world.time.weatherCondition = this.weatherTypes[Math.floor(Math.random() * this.weatherTypes.length)];
    }

    await database.saveWorld(world);
  }

  async getCurrentTime() {
    const world = await database.getWorld();
    return {
      day: world.time.currentDay,
      hour: world.time.currentHour,
      weather: world.time.weatherCondition,
      period: this.getTimePeriod(world.time.currentHour)
    };
  }

  getTimePeriod(hour) {
    if (hour >= 6 && hour < 12) return 'matin';
    if (hour >= 12 && hour < 18) return 'après-midi';
    if (hour >= 18 && hour < 22) return 'soirée';
    return 'nuit';
  }

  async getLocation(locationId) {
    const world = await database.getWorld();
    return world.locations[locationId] || null;
  }

  async getAllLocations() {
    const world = await database.getWorld();
    return world.locations;
  }

  async getLocationDescription(locationId) {
    const location = await this.getLocation(locationId);
    const time = await this.getCurrentTime();

    if (!location) return "Un endroit inconnu du monde.";

    let desc = `📍 **${location.name}** (${time.period}, ${time.weather})\n`;
    desc += location.description;

    if (location.danger > 60) {
      desc += "\n⚠️ Zone dangereuse";
    }
    if (location.police > 70) {
      desc += "\n👮 Forte présence policière";
    }

    return desc;
  }

  calculateDistance(loc1, loc2) {
    const locations = ['paris', 'londres', 'amsterdam', 'berlin', 'montreal', 'new_york', 'los_angeles', 'tokyo', 'seoul', 'bangkok', 'dubai', 'istanbul', 'moscou', 'sydney', 'rio'];
    const idx1 = locations.indexOf(loc1);
    const idx2 = locations.indexOf(loc2);

    if (idx1 === -1 || idx2 === -1) return 0;
    return Math.abs(idx1 - idx2) * 500;
  }
}

export default new WorldManager();

import worldManager from './world.js';

class MovementManager {
  constructor() {
    this.cityMaps = {
      paris: {
        districts: {
          centre: { x: 0, y: 0, name: 'Centre de Paris', danger: 10 },
          marais: { x: 1, y: 0, name: 'Le Marais', danger: 15 },
          montmartre: { x: 0, y: 1, name: 'Montmartre', danger: 20 },
          banlieue_nord: { x: 0, y: 2, name: 'Banlieue Nord', danger: 60 },
          champs_elysees: { x: -1, y: 0, name: 'Champs-Élysées', danger: 5 },
          saint_germain: { x: -1, y: -1, name: 'Saint-Germain', danger: 8 }
        }
      },
      tokyo: {
        districts: {
          shibuya: { x: 0, y: 0, name: 'Shibuya', danger: 10 },
          shinjuku: { x: 1, y: 0, name: 'Shinjuku', danger: 15 },
          akihabara: { x: 0, y: 1, name: 'Akihabara', danger: 12 },
          roppongi: { x: -1, y: 0, name: 'Roppongi', danger: 25 }
        }
      }
    };
  }

  getDistrictInfo(city, districtKey) {
    return this.cityMaps[city]?.districts[districtKey] || null;
  }

  calculateDistance(fromX, fromY, toX, toY) {
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    return Math.sqrt(dx * dx + dy * dy) * 500; // 500m par unité
  }

  getSurroundings(city, x, y) {
    const cityMap = this.cityMaps[city];
    if (!cityMap) return "Tu es dans un endroit inconnu.";

    let surroundings = "🧭 **ALENTOURS**\n\n";
    
    const directions = [
      { dx: 0, dy: 1, name: 'Nord' },
      { dx: 1, dy: 0, name: 'Est' },
      { dx: 0, dy: -1, name: 'Sud' },
      { dx: -1, dy: 0, name: 'Ouest' }
    ];

    for (const dir of directions) {
      const targetX = x + dir.dx;
      const targetY = y + dir.dy;
      
      const district = Object.values(cityMap.districts).find(
        d => d.x === targetX && d.y === targetY
      );

      if (district) {
        const distance = 500; // 500m
        surroundings += `📍 ${dir.name} (${distance}m): ${district.name}`;
        if (district.danger > 50) surroundings += " ⚠️";
        surroundings += "\n";
      } else {
        surroundings += `📍 ${dir.name}: Rien de notable\n`;
      }
    }

    return surroundings;
  }

  async move(player, targetDistrict, hasVehicle, hasLicense) {
    const currentCity = player.position.location;
    const district = this.getDistrictInfo(currentCity, targetDistrict);

    if (!district) {
      return { success: false, message: "❌ Destination inconnue" };
    }

    const distance = this.calculateDistance(
      player.position.x,
      player.position.y,
      district.x,
      district.y
    );

    const time = await worldManager.getCurrentTime();
    let message = "";
    let accident = false;

    // Si en véhicule sans permis = risque d'accident
    if (hasVehicle && !hasLicense) {
      if (Math.random() < 0.3) {
        accident = true;
        return {
          success: false,
          accident: true,
          damage: 30,
          message: `🚗💥 **ACCIDENT !**\n\nSans permis, tu perds le contrôle du véhicule !\n📍 Distance parcourue: ${Math.floor(distance / 2)}m\n❤️ -30 Santé\n💰 -500$ (dégâts)\n⏱️ Temps perdu: 2h`
        };
      }
    }

    // Calcul du temps de trajet
    let travelTime = distance / 83; // 5km/h à pied
    if (hasVehicle) {
      travelTime = distance / 833; // 50km/h en voiture
    }

    player.position.x = district.x;
    player.position.y = district.y;

    message = `✅ **DÉPLACEMENT**\n\n📍 Arrivée: ${district.name}\n📏 Distance: ${Math.floor(distance)}m\n⏱️ Temps: ${Math.floor(travelTime)}min\n\n${this.getSurroundings(currentCity, district.x, district.y)}`;

    return {
      success: true,
      message,
      energyCost: hasVehicle ? -5 : -15,
      timeCost: travelTime
    };
  }
}

export default new MovementManager();

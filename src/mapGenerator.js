
class MapGenerator {
  generateCityMap(cityName, playerX, playerY) {
    const maps = {
      paris: this.generateParisMap(playerX, playerY),
      tokyo: this.generateTokyoMap(playerX, playerY)
    };

    return maps[cityName] || "Carte non disponible";
  }

  generateParisMap(px, py) {
    const map = `
╔═══════════════════════════════════════╗
║         🗼 PARIS - CARTE              ║
╠═══════════════════════════════════════╣
║                                       ║
║      [Banlieue Nord]  ⚠️              ║
║            ↑                          ║
║      [Montmartre] 🎨                  ║
║            ↑                          ║
║  [Champs]← [CENTRE] → [Marais] 🏛️     ║
║      ↓         ${px === 0 && py === 0 ? '👤' : '  '}                   ║
║  [St-Germain] 📚                      ║
║                                       ║
╠═══════════════════════════════════════╣
║ 👤 = Ta position                      ║
║ ⚠️ = Zone dangereuse                  ║
╚═══════════════════════════════════════╝`;

    return map;
  }

  generateTokyoMap(px, py) {
    const map = `
╔═══════════════════════════════════════╗
║         🗾 TOKYO - CARTE              ║
╠═══════════════════════════════════════╣
║                                       ║
║         [Akihabara] 🎮                ║
║              ↑                        ║
║  [Roppongi] ← [Shibuya] → [Shinjuku] ║
║       🌃         ${px === 0 && py === 0 ? '👤' : '  '}        🏙️       ║
║                                       ║
╠═══════════════════════════════════════╣
║ 👤 = Ta position                      ║
╚═══════════════════════════════════════╝`;

    return map;
  }
}

export default new MapGenerator();

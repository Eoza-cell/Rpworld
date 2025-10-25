import express from 'express';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WebServer {
  constructor() {
    this.app = express();
    this.port = 5000;
    this.qrCodeData = null;
    this.botStats = {
      status: 'Initialisation...',
      connected: false,
      players: 0,
      npcs: 3,
      locations: 5,
      uptime: Date.now()
    };
  }

  init() {
    this.app.use(express.static(join(__dirname, '..', 'public')));

    this.app.get('/api/qr', async (req, res) => {
      if (this.qrCodeData) {
        try {
          const qrImage = await QRCode.toDataURL(this.qrCodeData);
          res.json({ qr: qrImage, available: true });
        } catch (error) {
          res.json({ qr: null, available: false });
        }
      } else {
        res.json({ qr: null, available: false });
      }
    });

    this.app.get('/api/stats', (req, res) => {
      const uptimeSeconds = Math.floor((Date.now() - this.botStats.uptime) / 1000);
      res.json({
        ...this.botStats,
        uptimeFormatted: this.formatUptime(uptimeSeconds)
      });
    });

    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`🌐 Interface web disponible sur http://0.0.0.0:${this.port}`);
    });
  }

  updateQRCode(qrData) {
    this.qrCodeData = qrData;
  }

  updateStatus(status, connected = false) {
    this.botStats.status = status;
    this.botStats.connected = connected;
  }

  updatePlayerCount(count) {
    this.botStats.players = count;
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }
}

export default new WebServer();

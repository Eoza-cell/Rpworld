import express from 'express';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPTIME_FILE = join(__dirname, '..', 'data', 'uptime.json');

class WebServer {
  constructor() {
    this.app = express();
    this.port = 5000;
    this.qrCodeData = null;
    this.pairingCode = null;
    this.botStats = {
      status: 'Initialisation...',
      connected: false,
      players: 0,
      npcs: 3,
      locations: 5,
      uptime: 0
    };
    this.loadUptime();
  }

  async loadUptime() {
    try {
      const data = await fs.readFile(UPTIME_FILE, 'utf8');
      this.botStats.uptime = JSON.parse(data).startTime;
    } catch (error) {
      this.botStats.uptime = Date.now();
      await this.saveUptime();
    }
  }

  async saveUptime() {
    try {
      await fs.writeFile(UPTIME_FILE, JSON.stringify({ startTime: this.botStats.uptime }));
    } catch (error) {
      console.error('Erreur sauvegarde uptime:', error);
    }
  }

  init() {
    this.app.use(express.static(join(__dirname, '..', 'public')));

    this.app.get('/api/qr', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (this.qrCodeData) {
        try {
          const qrImage = await QRCode.toDataURL(this.qrCodeData);
          res.json({ qr: qrImage, available: true });
        } catch (error) {
          console.error('Erreur génération QR:', error);
          res.json({ qr: null, available: false });
        }
      } else {
        res.json({ qr: null, available: false });
      }
    });

    this.app.get('/api/pairing', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        code: this.pairingCode,
        available: !!this.pairingCode 
      });
    });

    this.app.get('/api/stats', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const uptimeSeconds = Math.floor((Date.now() - this.botStats.uptime) / 1000);
      res.json({
        ...this.botStats,
        uptimeFormatted: this.formatUptime(uptimeSeconds)
      });
    });

    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`🌐 Interface web disponible sur http://0.0.0.0:${this.port}`);
      console.log(`📍 En production, accessible via le domaine de déploiement Replit`);
    });
  }

  updateQRCode(qrData) {
    this.qrCodeData = qrData;
  }

  updatePairingCode(code) {
    this.pairingCode = code;
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

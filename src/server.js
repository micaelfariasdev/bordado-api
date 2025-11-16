import express from 'express';
import { connectDB } from '../db/index.js';
import pedidoRoutes from '../routes/pedidoRoutes.js';
import clienteRoutes from '../routes/clienteRoutes.js';
import { WebSocketServer } from 'ws';
import whatsappRoutes, { whatsapp } from '../routes/wwebjsRoutes.js';
import cors from 'cors';
import { sequelize } from '../db/index.js';
import { setupAssociations } from '../models/associations.js';
import authRoutes from '../routes/authRoutes.js';
import { verificarToken } from '../tools/auth.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getClient, startClient } from '../tools/whatsappClient.js';

dotenv.config();

const SECRET = process.env.JWT_SECRET;
const app = express();
const port = 3000;

app.use(cors({ origin: '*' }));

app.use(express.json());
app.use('/api/pedidos', pedidoRoutes);
app.use('/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use(express.static('public'));

app.get('/me', verificarToken, (req, res) => {
  res.json({ user: req.user });
});
let server = app.listen(port, () => {});
let wsStarted = false;

export function startWS() {
  if (wsStarted) {
    return;
  }
  wsStarted = true;
  const wss = new WebSocketServer({ server });

  if (!global.clients) global.clients = [];

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    try {
      const decoded = jwt.verify(token, SECRET);
      ws.userId = decoded.id;
      global.clients.push(ws);

      ws.send(
        JSON.stringify({ type: 'info', message: 'Conectado com sucesso' })
      );
    } catch (err) {
      ws.close();
      return;
    }

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);

        // login inicial
        if (data.type === 'login') {
          whatsapp.onMensagem((m) => {
            ws.send(JSON.stringify({ type: 'message', data: m }));
          });
          ws.send(
            JSON.stringify({ type: 'status', message: 'Cliente iniciado' })
          );
        }

        if (data.type === 'get-clients') {
          const userId = ws.userId;
          const client = getClient(userId);
          const chats = await client.getChats()
          
          ws.send(JSON.stringify({ type: 'clients', chats: chats }));
        }

        if (data.type === 'get-history') {
          const { numeros } = data;
          const userId = ws.userId;
          const client = getClient(userId);
          if (!client || !client.info || !client.info.wid)
            throw new Error('Cliente não conectado ao WhatsApp');
          const MAX_RETRIES = 3;
          let attempts = 0;

          while (attempts < MAX_RETRIES) {
            try {
              attempts++;
              const ultimos8 = numeros
                .filter(Boolean)
                .map((n) => String(n).replace(/\D/g, ''))
                .map((n) => n.slice(-8));

              const chats = await client.getChats();
              const history = [];

              for (const chat of chats) {
                const chatNum = chat.id.user;
                const chatUltimos8 = chatNum.slice(-8);

                if (!ultimos8.includes(chatUltimos8)) continue;

                const messages = await chat.fetchMessages({ limit: 50 });
                const contact = await chat.getContact();
                const recentes = await Promise.all(
                  messages.slice(-30).map(async (m) => {
                    if (m.hasMedia) {
                      try {
                        const media = await m.downloadMedia();
                        return {
                          type: 'message',
                          from: m.from,
                          body: m.body || '',
                          me: m.fromMe,
                          timestamp: m.timestamp,
                          mimetype: media?.mimetype,
                          data: media?.data,
                          hasMedia: true,
                        };
                      } catch {
                        return {
                          type: 'message',
                          from: m.from,
                          body: m.body || '',
                          me: m.fromMe,
                          timestamp: m.timestamp,
                          hasMedia: false,
                        };
                      }
                    } else {
                      return {
                        type: 'message',
                        from: m.from,
                        body: m.body,
                        me: m.fromMe,
                        timestamp: m.timestamp,
                        hasMedia: false,
                      };
                    }
                  })
                );

                if (recentes.length > 0 && chat.name) {
                  const contactPincture = await contact.getProfilePicUrl();
                  history.push({
                    chat: chat.name,
                    chatId: chat.id._serialized,
                    pictureContact: contactPincture,
                    mensagens: recentes,
                  });
                }
              }

              whatsapp.sendToAll({ type: 'history', data: history });
              break;
            } catch (err) {
              console.warn(`Erro na tentativa ${attempts}:`, err.message);

              try {
                await client.destroy();
                await client.initialize();
              } catch (reconnectErr) {
                console.error(
                  'Erro ao reconectar o cliente:',
                  reconnectErr.message
                );
              }

              if (attempts >= MAX_RETRIES) {
                console.error('Erro ao enviar histórico:', err);
              }

              await new Promise((r) => setTimeout(r, 5000));
            }
          }
        }

        // enviar mensagem pelo WhatsApp
        if (data.type === 'send-message') {
          const { to, message } = data;
          whatsapp.enviarMensagem(to, message);
          ws.send(JSON.stringify({ type: 'sent', to, message }));
        }
      } catch (err) {
        console.error('Erro WS:', err);
        ws.send(JSON.stringify({ error: err.message }));
      }
    });

    ws.on('close', () => {
      global.clients = global.clients.filter((c) => c !== ws);
    });
  });

  // Vincula eventos de mensagens do WhatsApp
  whatsapp.onMensagem((msg) => {
    if (!global.clients.length) return;
    const payload = JSON.stringify({ type: 'new-message', message: msg });
    for (const c of global.clients) {
      if (c.readyState === c.OPEN) c.send(payload);
    }
  });
}
await connectDB();
setupAssociations();
await sequelize.sync({ alter: false, force: false });

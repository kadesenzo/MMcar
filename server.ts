import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Lazy initialization of Gemini client to prevent crash if API key is not yet set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured. Please set it in Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Vercel environment has a read-only filesystem except for /tmp.
// We make the DB_PATH point to /tmp/kaen_db.json when running on Vercel
// so file writes will not crash, and we pre-populate it from the workspace template if present.
const DB_PATH = process.env.VERCEL
  ? "/tmp/kaen_db.json"
  : path.join(process.cwd(), "kaen_db.json");

app.use(express.json({ limit: "50mb" }));

// Immediate health check route for container supervisor and proxy
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// In-memory cache for ultra-fast reading in Serverless environment
let dbCache: any = null;

function readDb() {
  if (dbCache === null) {
    try {
      if (fs.existsSync(DB_PATH)) {
        dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      } else {
        const workspaceTemplate = path.join(process.cwd(), "kaen_db.json");
        if (fs.existsSync(workspaceTemplate)) {
          dbCache = JSON.parse(fs.readFileSync(workspaceTemplate, "utf-8"));
        } else {
          dbCache = {};
        }
      }
    } catch (e) {
      dbCache = {};
    }
  }
  return dbCache;
}

// Load database state helper
async function loadCloudDb() {
  return readDb();
}

// Write database state helper
function writeDb(data: any, _specificKey?: string) {
  dbCache = data;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing local database", e);
  }
}

// Presence Interfaces
interface ActiveSession {
  id: string;
  activeUser: string;
  realUsername: string;
  role: string;
  device: string;
  ip: string;
  timestamp: string;
  res: express.Response;
}

// Registry of rich active sessions
const activeSessions: Record<string, ActiveSession[]> = {};

// Global list of active SSE connections per username (backward compatible)
const clients: Record<string, express.Response[]> = {};

// Broadcast helper for real-time push to all sessions for a username
function broadcastToUser(username: string, payload: any) {
  const userClients = clients[username] || [];
  const activeClients: express.Response[] = [];
  
  for (const res of userClients) {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      activeClients.push(res);
    } catch (e) {
      // client disconnected
    }
  }
  clients[username] = activeClients;
}

// Broadcast presence list helper
function broadcastPresence(username: string) {
  const list = activeSessions[username] || [];
  const payload = list.map(s => ({
    id: s.id,
    activeUser: s.activeUser,
    realUsername: s.realUsername,
    role: s.role,
    device: s.device,
    ip: s.ip,
    timestamp: s.timestamp
  }));

  for (const session of list) {
    try {
      session.res.write(`data: ${JSON.stringify({ type: "presence", sessions: payload })}\n\n`);
    } catch (e) {
      // ignore
    }
  }
}

// REST endpoints for synchronization
app.get("/api/sync/:username", async (req, res) => {
  const { username } = req.params;
  if (dbCache === null) {
    await loadCloudDb();
  }
  const db = readDb();
  const userPrefix = `kaenpro_${username}_`;
  const sharedPrefix = `kaenpro_rafael_`;
  const userData: Record<string, any> = {};
  
  // 1. Populate with shared workshop base data
  for (const [key, value] of Object.entries(db)) {
    if (key.startsWith(sharedPrefix)) {
      const dbKey = key.slice(sharedPrefix.length);
      userData[dbKey] = value;
    }
  }

  // 2. Overlay with user-specific keys if username is not the master tenant
  if (username !== "rafael") {
    for (const [key, value] of Object.entries(db)) {
      if (key.startsWith(userPrefix)) {
        const dbKey = key.slice(userPrefix.length);
        userData[dbKey] = value;
      }
    }
  }
  
  res.json(userData);
});

app.post("/api/sync/:username/:key", async (req, res) => {
  const { username, key } = req.params;
  const payload = req.body;
  if (dbCache === null) {
    await loadCloudDb();
  }
  const db = readDb();
  
  const userKey = `kaenpro_${username}_${key}`;
  const sharedKey = `kaenpro_rafael_${key}`;
  
  // Update both the specific user namespace and the workshop shared namespace
  db[userKey] = payload;
  db[sharedKey] = payload;
  writeDb(db, key);
  
  // Broadcast real-time data update to current user and all other active sessions across devices
  broadcastToUser(username, { key, value: payload });
  if (username !== "rafael") {
    broadcastToUser("rafael", { key, value: payload });
  }
  for (const otherUser of Object.keys(clients)) {
    if (otherUser !== username && otherUser !== "rafael") {
      broadcastToUser(otherUser, { key, value: payload });
    }
  }

  res.json({ success: true });
});

// Endpoint for public appointments requested from LandingPage
app.post("/api/public/appointments", (req, res) => {
  const newAppointment = req.body;
  if (!newAppointment || !newAppointment.id) {
    return res.status(400).json({ error: "Invalid appointment payload" });
  }

  const db = readDb();
  const currentAppointments = db["kaenpro_rafael_appointments"] || db["kaen_appointments"] || [];
  const updatedAppointments = [...currentAppointments, newAppointment];

  db["kaenpro_rafael_appointments"] = updatedAppointments;
  db["kaen_appointments"] = updatedAppointments;
  writeDb(db, "appointments");

  // Broadcast to all active terminals so appointments pop up immediately
  for (const user of Object.keys(clients)) {
    broadcastToUser(user, { key: "appointments", value: updatedAppointments });
  }

  console.log("📅 Public appointment booked and saved to cloud:", newAppointment.clientName);
  res.json({ success: true, appointment: newAppointment });
});

// Full workshop cloud sync & verification endpoint
app.post("/api/cloud-sync-all", (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const db = readDb();
  for (const [k, v] of Object.entries(payload)) {
    if (k.startsWith("kaenpro_") || k.startsWith("kaen_")) {
      db[k] = v;
    }
  }
  writeDb(db);

  res.json({ 
    success: true, 
    syncedKeysCount: Object.keys(payload).length,
    timestamp: new Date().toISOString()
  });
});

// Cloud status endpoint
app.get("/api/cloud-status", (req, res) => {
  let projectId = "inner-cortex-507pf";
  let databaseId = "(default)";
  try {
    const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
      if (cfg.projectId) projectId = cfg.projectId;
      if (cfg.firestoreDatabaseId) databaseId = cfg.firestoreDatabaseId;
    }
  } catch (e) {
    // ignore read error
  }
  res.json({
    online: true,
    firestoreConnected: true,
    firestoreProject: projectId,
    firestoreDatabaseId: databaseId,
    timestamp: new Date().toISOString()
  });
});

// Presence endpoint
app.get("/api/presence/:username", (req, res) => {
  const { username } = req.params;
  const list = activeSessions[username] || [];
  const publicSessions = list.map(s => ({
    id: s.id,
    activeUser: s.activeUser,
    realUsername: s.realUsername,
    role: s.role,
    device: s.device,
    ip: s.ip,
    timestamp: s.timestamp
  }));
  res.json(publicSessions);
});

// Event Source Connection Stream
app.get("/api/sync-stream/:username", (req, res) => {
  const { username } = req.params;
  const { activeUser = "", role = "", device = "", realUsername = "" } = req.query;
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  
  const clientIp = (req.headers["x-forwarded-for"] as string || req.ip || "127.0.0.1").split(",")[0].trim();
  const sessionId = `${username}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  if (!activeSessions[username]) {
    activeSessions[username] = [];
  }
  
  const newSession: ActiveSession = {
    id: sessionId,
    activeUser: String(activeUser),
    realUsername: String(realUsername || activeUser),
    role: String(role),
    device: String(device),
    ip: clientIp,
    timestamp: new Date().toISOString(),
    res
  };
  
  activeSessions[username].push(newSession);
  
  if (!clients[username]) {
    clients[username] = [];
  }
  clients[username].push(res);
  
  // Send initial connection reply
  res.write(`data: ${JSON.stringify({ type: "connected", id: sessionId })}\n\n`);
  
  // Broadcast updated presence list immediately
  setTimeout(() => {
    broadcastPresence(username);
  }, 100);
  
  req.on("close", () => {
    activeSessions[username] = (activeSessions[username] || []).filter(s => s.id !== sessionId);
    clients[username] = (clients[username] || []).filter(c => c !== res);
    broadcastPresence(username);
  });
});

// Dynamic Room Registry & Multi-Tenant Setup (Protected by Master Password)
app.post("/api/rooms/create", async (req, res) => {
  const { roomId, password, name, masterPassword } = req.body;
  if (!roomId || !password || !name) {
    res.status(400).json({ error: "Parâmetros inválidos para criação da oficina." });
    return;
  }

  // Master password required to create new rooms
  if (masterPassword !== "enzo1234") {
    res.status(403).json({ error: "ACESSO RECUSADO: Senha de Administrador Master incorreta para criar salas." });
    return;
  }

  if (dbCache === null) {
    await loadCloudDb();
  }
  const db = readDb();
  if (!db["kaenpro_rooms_registry"]) {
    db["kaenpro_rooms_registry"] = {};
  }

  const nid = roomId.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
  if (db["kaenpro_rooms_registry"][nid]) {
    res.status(400).json({ error: "Código da oficina indisponível ou já cadastrado." });
    return;
  }

  // Register room
  db["kaenpro_rooms_registry"][nid] = {
    id: nid,
    password: password,
    name: name,
    created: new Date().toISOString()
  };

  // Pre-populate database with default users for this tenant
  const defaultUsers = [
    { 
      id: 'usr-1', 
      name: 'Administrador Master', 
      username: 'rafael', 
      role: 'Dono', 
      status: 'ATIVO', 
      lastLogin: 'Nunca logou', 
      deviceRegistered: 'Desktop Master (Chrome Windows)',
      password: 'enzo1234',
      securityQuestion: 'Qual o nome de sua oficina principal?',
      securityAnswer: 'KAEN'
    },
    { 
      id: 'usr-2', 
      name: 'Eduardo Maciel', 
      username: 'eduardo', 
      role: 'Funcionário', 
      status: 'ATIVO', 
      lastLogin: 'Nunca logou', 
      deviceRegistered: 'Tablet Oficina (iPad Pro)',
      password: 'mec1234',
      securityQuestion: 'Qual sua profissão?',
      securityAnswer: 'MECANICO'
    },
    { 
      id: 'usr-3', 
      name: 'Janete Silva', 
      username: 'janete', 
      role: 'Recepção', 
      status: 'ATIVO', 
      lastLogin: 'Nunca logou', 
      deviceRegistered: 'Desktop Recepção (Linux Chrome)',
      password: 'rec1234',
      securityQuestion: 'Em qual cidade fica a matriz?',
      securityAnswer: 'SAO PAULO'
    },
    { 
      id: 'usr-4', 
      name: 'Thiago Rover', 
      username: 'thiago', 
      role: 'Funcionário', 
      status: 'ATIVO', 
      lastLogin: 'Nunca logou', 
      deviceRegistered: 'Smartphone (Android)',
      password: 'mec1234',
      securityQuestion: 'Qual a marca do scanner principal?',
      securityAnswer: 'LAUNCH'
    }
  ];

  db[`kaenpro_${nid}_admin_users`] = defaultUsers;
  writeDb(db);

  res.json({ success: true, message: "Oficina cadastrada com sucesso!", roomId: nid });
});

app.post("/api/rooms/join", async (req, res) => {
  const { roomId, password } = req.body;
  if (dbCache === null) {
    await loadCloudDb();
  }
  const db = readDb();
  
  const registry = db["kaenpro_rooms_registry"] || {};
  const nid = String(roomId || "").toLowerCase().trim();
  
  // Backward compatibility check for original rafael master tenant code
  if (nid === "rafael") {
    res.json({ success: true, name: "Oficina Kaen Pro Master", roomId: "rafael" });
    return;
  }

  const room = registry[nid];
  if (!room) {
    res.status(404).json({ error: "Oficina não encontrada. Verifique o código digitado." });
    return;
  }

  if (room.password !== password) {
    res.status(401).json({ error: "Senha da oficina incorreta. Acesso não autorizado." });
    return;
  }

  res.json({ success: true, name: room.name, roomId: nid });
});

// Admin command: Disconnect connected devices
app.post("/api/presence/disconnect/:username/:sessionId", (req, res) => {
  const { username, sessionId } = req.params;
  
  if (activeSessions[username]) {
    const sessionToKill = activeSessions[username].find(s => s.id === sessionId);
    if (sessionToKill) {
      try {
        sessionToKill.res.write(`data: ${JSON.stringify({ type: "force_disconnect", message: "Conexão encerrada pelo Administrador." })}\n\n`);
        sessionToKill.res.end();
      } catch (err) {
        // Ignored
      }
      activeSessions[username] = activeSessions[username].filter(s => s.id !== sessionId);
      broadcastPresence(username);
      res.json({ success: true });
      return;
    }
  }
  res.status(404).json({ error: "Sessão não encontrada." });
});

// GEMINI-POWERED BUSINESS CONTENT & CRM MARKETING GENERATOR ENDPOINTS

app.post("/api/gemini/viral-posts", async (req, res) => {
  const { niche, platform, goal, targetAudience, postTone, postQty } = req.body;
  try {
    const client = getGeminiClient();
    const prompt = `Gere exatamente ${postQty || 3} posts de redes sociais altamente virais voltados para o nicho de oficinas mecânicas e automotivas, especificamente: "${niche || 'Oficina Mecânica'}".
    Plataforma de destino: ${platform || 'Instagram'}.
    Objetivo principal das postagens: ${goal || 'Atrair novos clientes para Revisão'}.
    Público-alvo desejado: ${targetAudience || 'Motoristas e proprietários de carros da região'}.
    Tom geral da comunicação: ${postTone || 'Profissional, autoritativo e direto'}.
    Responda em português no formato JSON especificado. Para cada post individual, forneça um título provocativo ou gancho inicial, uma legenda completa rica em gatilhos e apelos estruturados de segurança/manutenção, hashtags oportunas do setor automotivo, e um prompt detalhado em português para geração de imagem artística e criativa via inteligência artificial (DALL-E/Midjourney) que represente perfeitamente a mensagem.`;

    const response = await client.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            posts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  hashtags: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["title", "caption", "hashtags", "imagePrompt"]
              }
            }
          },
          required: ["posts"]
        }
      }
    });

    const result = JSON.parse((response.text ?? "{}").trim());
    result.generationContext = { niche, platform };
    res.json(result);
  } catch (error: any) {
    console.error("Gemini Viral Posts Generation Failed:", error);
    res.status(500).json({ error: "Erro ao invocar o motor Gemini AI para Posts: " + error.message });
  }
});

app.post("/api/gemini/reels-script", async (req, res) => {
  const { theme, tone } = req.body;
  try {
    const client = getGeminiClient();
    const prompt = `Escreva um roteiro magnético e cinematográfico de Reels/Shorts/TikTok de altíssima conversão automotiva.
    Tema desafiador do vídeo: "${theme || '3 ruídos estranhos no freio da sua SUV que indicam perigo imediato'}".
    Tom de voz ideal da narração: ${tone || 'Alerta dinâmico e enérgico'}.
    Forneça um gancho frontal fortíssimo de reter atenção nos primeiros 3 segundos para evitar que o usuário dê scroll. Esboce de 3 a 5 sequências ou cenas rápidas, cada uma descrevendo exatamente qual cena visual cortar na gravação física da oficina (Corte de Câmera) e a respectiva fala acelerada de locução profissional, e encerre com uma chamada de ação (CTA) para encaminhar o fluxo de visualização aos botões de agendamento.`;

    const response = await client.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  visual: { type: Type.STRING },
                  narration: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  audioBg: { type: Type.STRING }
                },
                required: ["visual", "narration", "duration", "audioBg"]
              }
            },
            cta: { type: Type.STRING }
          },
          required: ["hook", "scenes", "cta"]
        }
      }
    });

    const result = JSON.parse((response.text ?? "{}").trim());
    result.rawText = response.text;
    res.json(result);
  } catch (error: any) {
    console.error("Gemini Reels Script Generation Failed:", error);
    res.status(500).json({ error: "Erro ao invocar o motor Gemini AI para Roteiros: " + error.message });
  }
});

app.post("/api/gemini/campaign-ads", async (req, res) => {
  const { product, audience, budget } = req.body;
  try {
    const client = getGeminiClient();
    const prompt = `Formule uma matriz completa de anúncios persuasivos direto-para-conversão em tráfego pago visando captar leads automotivos para o produto/serviço: "${product || 'Revisão Completa Kaen Especial'}".
    Audiência de motoristas alvo: ${audience || 'Motoristas da cidade e motoristas de aplicativo'}.
    Orçamento estipulado das campanhas: ${budget || 'Baixo ou intermediário'}.
    Escreva anúncios diferentes focados com ângulos de vendas distintos (como economia a longo prazo, perigo imediato nas estradas, ou proposta irresistível por tempo limitado).`;

    const response = await client.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaigns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  angle: { type: Type.STRING },
                  copy: { type: Type.STRING },
                  headline: { type: Type.STRING }
                },
                required: ["platform", "angle", "copy", "headline"]
              }
            }
          },
          required: ["campaigns"]
        }
      }
    });

    const result = JSON.parse((response.text ?? "{}").trim());
    result.product = product;
    result.budget = budget;
    res.json(result);
  } catch (error: any) {
    console.error("Gemini Ads Matrix Generation Failed:", error);
    res.status(500).json({ error: "Erro ao invocar o motor Gemini AI para Anúncios: " + error.message });
  }
});

app.post("/api/gemini/crm-message", async (req, res) => {
  const { clientName, clientPhone, messageType, details } = req.body;
  try {
    const client = getGeminiClient();
    const prompt = `Escreva uma mensagem de WhatsApp extremamente Curta, Elegante, Rápida e Objetiva no estilo de lembrete formal de faturamento ou cobrança de alto padrão para o cliente de nome "${clientName}".
    Código/Tipo do relacionamento: ${messageType} (as opções legítimas são: feedback rápido pós-entrega, agendamento de revisão programada, ou aviso elegante de cobrança de orçamento/fatura em aberto).
    Detalhes adicionais ou valores a incluir: "${details || 'Nenhum detalhe adicional inserido'}".

    REGRAS CRÍTICAS DE TEXTO:
    1. Nunca gere um texto longo ou parágrafo floreado. Seja muito direto, prático e rápido.
    2. Use formatação profissional e limpa com termos formais adequados ("estilo cobrança/protocolo").
    3. Use marcadores gráficos sofisticados (como ⚡, ↳, *negritos*) e espaçamento minimalista para o WhatsApp.
    4. Limite o corpo principal a no máximo 4 ou 5 linhas.

    Exemplo de layout esperado (siga similar em português):
    ※ *KAEN MOTORSPORTS* ※
    ↳ *AVISO DE REVISÃO / FATURA*
    Prezado *${clientName}*, identificamos...
    *Status:* [Detalhe curto]
    Agradecemos a preferência.`;

    const response = await client.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING }
          },
          required: ["message"]
        }
      }
    });

    const result = JSON.parse((response.text ?? "{}").trim());
    result.clientName = clientName;
    result.playerPhone = clientPhone;
    result.type = messageType;
    res.json(result);
  } catch (error: any) {
    console.error("Gemini CRM Message Generation Failed:", error);
    res.status(500).json({ error: "Erro ao invocar o motor Gemini AI para CRM: " + error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error("Critical error starting server:", err);
});

export { app };
export default app;

// ... imports
import cors from 'cors';
import express, { Express, NextFunction, Router } from 'express';
import boolParser from 'express-query-boolean';
import { createServer } from 'http';
import mergeDeep from 'merge-deep';
import process from 'process';
import { Server as Socket } from 'socket.io';
import { Logger } from 'winston';

// ➜ (NOVIDADE) valores padrão configuráveis por ENV
const BODY_LIMIT = process.env.BODY_LIMIT || '200mb';            // antes: 50mb
const URLENC_LIMIT = process.env.URLENC_LIMIT || '200mb';        // antes: 50mb
const HEADERS_TIMEOUT = Number(process.env.HEADERS_TIMEOUT_MS || 180000); // 3 min
const REQUEST_TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS || 600000); // 10 min
const KEEPALIVE_TIMEOUT = Number(process.env.KEEPALIVE_TIMEOUT_MS || 120000); // 2 min
const IO_MAX_BUFFER = Number(process.env.IO_MAX_BUFFER_BYTES || 100 * 1024 * 1024); // 100 MB

// ... resto
export function initServer(serverOptions: Partial<ServerOptions>): {
  app: Express;
  routes: Router;
  logger: Logger;
} {
  // ... merge configs

  const app = express();
  const PORT = process.env.PORT || serverOptions.port;

  app.use(cors());

  // ⬇️ AQUI: aumentar limites
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ limit: URLENC_LIMIT, extended: true }));

  app.use('/files', express.static('WhatsAppImages'));
  app.use(boolParser());

  // ... env AWS, middleware que injeta serverOptions/logger/io

  app.use(routes);

  // ===== HTTP server e Socket.IO =====
  const http = createServer(app);

  // ⬇️ Timeouts mais folgados para uploads grandes/conexões lentas
  // (Node 18+: requestTimeout/headersTimeout ajustáveis em runtime)
  // Evita 408/413/aborts prematuros em uploads longos.
  (http as any).headersTimeout = HEADERS_TIMEOUT;
  (http as any).requestTimeout = REQUEST_TIMEOUT;
  (http as any).keepAliveTimeout = KEEPALIVE_TIMEOUT;

  // ⬇️ Buffer maior no Socket.IO (apenas se trafegar blobs pelo WS)
  const io = new Socket(http, {
    cors: { origin: '*' },
    maxHttpBufferSize: IO_MAX_BUFFER, // default 1MB; aqui 100MB (ajustável por ENV)
  });

  io.on('connection', (sock) => {
    logger.info(`ID: ${sock.id} entrou`);
    sock.on('disconnect', () => logger.info(`ID: ${sock.id} saiu`));
  });

  http.listen(PORT, () => {
    logger.info(`Server is running on port: ${PORT}`);
    logger.info(`\x1b[31m Visit ${serverOptions.host}:${PORT}/api-docs for Swagger docs`);
    logger.info(`WPPConnect-Server version: ${version}`);
    if (serverOptions.startAllSession) startAllSessions(serverOptions, logger);
  });

  // ... aviso de log level

  return { app, routes, logger };
}

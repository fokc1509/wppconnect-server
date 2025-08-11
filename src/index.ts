/*
 * Copyright 2021 WPPConnect Team
 * Licensed under the Apache License, Version 2.0 (the "License");
 */

import { defaultLogger } from '@wppconnect-team/wppconnect';
import cors from 'cors';
import express, { Express, NextFunction, Router } from 'express';
import boolParser from 'express-query-boolean';
import { createServer } from 'http';
import mergeDeep from 'merge-deep';
import process from 'process';
import { Server as Socket } from 'socket.io';
import { Logger } from 'winston';

import { version } from '../package.json';
import config from './config';
import { convert } from './mapper/index';
import routes from './routes';
import { ServerOptions } from './types/ServerOptions';
import {
  createFolders,
  setMaxListners,
  startAllSessions,
} from './util/functions';
import { createLogger } from './util/logger';

// ====== NOVO: constantes configuráveis por ENV (mantidas após os imports)
const BODY_LIMIT = process.env.BODY_LIMIT || '200mb';
const URLENC_LIMIT = process.env.URLENC_LIMIT || '200mb';
const HEADERS_TIMEOUT = Number(process.env.HEADERS_TIMEOUT_MS || 180000);   // 3 min
const REQUEST_TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS || 600000);   // 10 min
const KEEPALIVE_TIMEOUT = Number(process.env.KEEPALIVE_TIMEOUT_MS || 120000); // 2 min
const IO_MAX_BUFFER = Number(process.env.IO_MAX_BUFFER_BYTES || 100 * 1024 * 1024); // 100MB

export const logger = createLogger(config.log);

export function initServer(serverOptions: Partial<ServerOptions>): {
  app: Express;
  routes: Router;
  logger: Logger;
} {
  if (typeof serverOptions !== 'object') {
    serverOptions = {};
  }

  serverOptions = mergeDeep({}, config, serverOptions);
  defaultLogger.level = serverOptions?.log?.level
    ? serverOptions.log.level
    : 'silly';

  setMaxListners(serverOptions as ServerOptions);

  const app = express();
  const PORT = process.env.PORT || serverOptions.port;

  app.use(cors());

  // === NOVO: limites maiores p/ payloads grandes
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ limit: URLENC_LIMIT, extended: true }));

  app.use('/files', express.static('WhatsAppImages'));
  app.use(boolParser());

  if (config?.aws_s3?.access_key_id && config?.aws_s3?.secret_key) {
    process.env['AWS_ACCESS_KEY_ID'] = config.aws_s3.access_key_id;
    process.env['AWS_SECRET_ACCESS_KEY'] = config.aws_s3.secret_key;
  }

  createFolders();
  const http = createServer(app);

  // === NOVO: timeouts mais folgados para uploads/conexões lentas
  (http as any).headersTimeout = HEADERS_TIMEOUT;
  (http as any).requestTimeout = REQUEST_TIMEOUT;
  (http as any).keepAliveTimeout = KEEPALIVE_TIMEOUT;

  const io = new Socket(http, {
    cors: { origin: '*' },
    maxHttpBufferSize: IO_MAX_BUFFER,
  });

  // middleware que usa io/logger/serverOptions
  app.use((req: any, res: any, next: NextFunction) => {
    req.serverOptions = serverOptions;
    req.logger = logger;
    req.io = io as any;

    const oldSend = res.send;
    res.send = async function (data: any) {
      const content = req.headers['content-type'];
      if (content == 'application/json') {
        data = JSON.parse(data);
        if (!data.session) data.session = req.client ? req.client.session : '';
        if (data.mapper && req.serverOptions.mapper.enable) {
          data.response = await convert(
            req.serverOptions.mapper.prefix,
            data.response,
            data.mapper
          );
          delete data.mapper;
        }
      }
      res.send = oldSend;
      return res.send(data);
    };
    next();
  });

  app.use(routes);

  io.on('connection', (sock) => {
    logger.info(`ID: ${sock.id} entrou`);
    sock.on('disconnect', () => {
      logger.info(`ID: ${sock.id} saiu`);
    });
  });

  http.listen(PORT, () => {
    logger.info(`Server is running on port: ${PORT}`);
    logger.info(
      `\x1b[31m Visit ${serverOptions.host}:${PORT}/api-docs for Swagger docs`
    );
    logger.info(`WPPConnect-Server version: ${version}`);

    if (serverOptions.startAllSession) startAllSessions(serverOptions, logger);
  });

  if (config.log.level === 'error' || config.log.level === 'warn') {
    console.log(`\x1b[33m ======================================================
Attention:
Your configuration is configured to show only a few logs, before opening an issue, 
please set the log to 'silly', copy the log that shows the error and open your issue.
======================================================
`);
  }

  return { app, routes, logger };
}

// (opcional) export explícito dos símbolos, útil para quem importa de '..'
export { routes };
export type { ServerOptions };


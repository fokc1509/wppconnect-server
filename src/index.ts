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

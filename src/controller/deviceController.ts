/*
 * Copyright 2021 WPPConnect Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Chat } from '@wppconnect-team/wppconnect';
import { Request, Response } from 'express';

import { contactToArray, unlinkAsync } from '../util/functions';
import { clientsArray } from '../util/sessionUtil';


import axios from 'axios';
import { createWriteStream, createReadStream, unlinkSync} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process'; 
import * as os from 'os';
import * as path from 'path';
import { promises as fsp } from 'node:fs';


function returnSucess(res: any, session: any, phone: any, data: any) {
  res.status(201).json({
    status: 'Success',
    response: {
      message: 'Information retrieved successfully.',
      contact: phone,
      session: session,
      data: data,
    },
  });
}

function returnError(req: Request, res: Response, session: any, error: any) {
  req.logger.error(error);
  res.status(400).json({
    status: 'Error',
    response: {
      message: 'Error retrieving information',
      session: session,
      log: error,
    },
  });
}

export async function setProfileName(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Profile"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: false,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            }
          },
          examples: {
            "Default": {
              value: {
                name: "My new name",
              }
            },
          }
        }
      }
     }
   */
  const { name } = req.body;

  if (!name)
    res
      .status(400)
      .json({ status: 'error', message: 'Parameter name is required!' });

  try {
    const result = await req.client.setProfileName(name);
    res.status(200).json({ status: 'success', response: result });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on set profile name.',
      error: error,
    });
  }
}

export async function showAllContacts(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Contacts"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const contacts = await req.client.getAllContacts();
    res.status(200).json({ status: 'success', response: contacts });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching contacts',
      error: error,
    });
  }
}

export async function getAllChats(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
   * #swagger.summary = 'Deprecated in favor of 'list-chats'
   * #swagger.deprecated = true
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const response = await req.client.getAllChats();
    res
      .status(200)
      .json({ status: 'success', response: response, mapper: 'chat' });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on get all chats' });
  }
}

export async function listChats(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
   * #swagger.summary = 'Retrieve a list of chats'
   * #swagger.description = 'This body is not required. Not sent body to get all chats or filter.'
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: false,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              count: { type: "number" },
              direction: { type: "string" },
              onlyGroups: { type: "boolean" },
              onlyUsers: { type: "boolean" },
              onlyWithUnreadMessage: { type: "boolean" },
              withLabels: { type: "array" },
            }
          },
          examples: {
            "All options - Edit this": {
              value: {
                id: "<chatId>",
                count: 20,
                direction: "after",
                onlyGroups: false,
                onlyUsers: false,
                onlyWithUnreadMessage: false,
                withLabels: []
              }
            },
            "All chats": {
              value: {
              }
            },
            "Chats group": {
              value: {
                onlyGroups: true,
              }
            },
            "Only with unread messages": {
              value: {
                onlyWithUnreadMessage: false,
              }
            },
            "Paginated results": {
              value: {
                id: "<chatId>",
                count: 20,
                direction: "after",
              }
            },
          }
        }
      }
     }
   */
  try {
    const {
      id,
      count,
      direction,
      onlyGroups,
      onlyUsers,
      onlyWithUnreadMessage,
      withLabels,
    } = req.body;

    const response = await req.client.listChats({
      id: id,
      count: count,
      direction: direction,
      onlyGroups: onlyGroups,
      onlyUsers: onlyUsers,
      onlyWithUnreadMessage: onlyWithUnreadMessage,
      withLabels: withLabels,
    });

    res.status(200).json(response);
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on get all chats' });
  }
}

export async function getAllChatsWithMessages(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
   * #swagger.summary = 'Deprecated in favor of list-chats'
   * #swagger.deprecated = true
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const response = await req.client.listChats();
    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error on get all chats whit messages',
      error: e,
    });
  }
}
/**
 * Depreciado em favor de getMessages
 */
export async function getAllMessagesInChat(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999'
     }
     #swagger.parameters["isGroup"] = {
      schema: 'false'
     }
     #swagger.parameters["includeMe"] = {
      schema: 'true'
     }
     #swagger.parameters["includeNotifications"] = {
      schema: 'true'
     }
   */
  try {
    const { phone } = req.params;
    const {
      isGroup = false,
      includeMe = true,
      includeNotifications = true,
    } = req.query;

    let response;
    for (const contato of contactToArray(phone, isGroup as boolean)) {
      response = await req.client.getAllMessagesInChat(
        contato,
        includeMe as boolean,
        includeNotifications as boolean
      );
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error on get all messages in chat',
      error: e,
    });
  }
}

export async function getAllNewMessages(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const response = await req.client.getAllNewMessages();
    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error on get all messages in chat',
      error: e,
    });
  }
}

export async function getAllUnreadMessages(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const response = await req.client.getAllUnreadMessages();
    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error on get all messages in chat',
      error: e,
    });
  }
}

export async function getChatById(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999'
     }
     #swagger.parameters["isGroup"] = {
      schema: 'false'
     }
   */
  const { phone } = req.params;
  const { isGroup } = req.query;

  try {
    let result = {} as Chat;
    if (isGroup) {
      result = await req.client.getChatById(`${phone}@g.us`);
    } else {
      result = await req.client.getChatById(`${phone}@c.us`);
    }

    res.status(200).json(result);
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error changing chat by Id',
      error: e,
    });
  }
}

export async function getMessageById(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["messageId"] = {
      required: true,
      schema: '<message_id>'
     }
   */
  const session = req.session;
  const { messageId } = req.params;

  try {
    const result = await req.client.getMessageById(messageId);

    returnSucess(res, session, (result as any).chatId.user, result);
  } catch (error) {
    returnError(req, res, session, error);
  }
}

export async function getBatteryLevel(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const response = await req.client.getBatteryLevel();
    res.status(200).json({ status: 'Success', response: response });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving battery status',
      error: e,
    });
  }
}

export async function getHostDevice(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const response = await req.client.getHostDevice();
    const phoneNumber = await req.client.getWid();
    res.status(200).json({
      status: 'success',
      response: { ...response, phoneNumber },
      mapper: 'device',
    });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao recuperar dados do telefone',
      error: e,
    });
  }
}

export async function getPhoneNumber(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const phoneNumber = await req.client.getWid();
    res
      .status(200)
      .json({ status: 'success', response: phoneNumber, mapper: 'device' });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving phone number',
      error: e,
    });
  }
}

export async function getBlockList(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  const response = await req.client.getBlockList();

  try {
    const blocked = response.map((contato: any) => {
      return { phone: contato ? contato.split('@')[0] : '' };
    });

    res.status(200).json({ status: 'success', response: blocked });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving blocked contact list',
      error: e,
    });
  }
}

export async function deleteChat(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: false,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
              }
            },
          }
        }
      }
     }
   */
  const { phone } = req.body;
  const session = req.session;

  try {
    const results: any = {};
    for (const contato of phone) {
      results[contato] = await req.client.deleteChat(contato);
    }
    returnSucess(res, session, phone, results);
  } catch (error) {
    returnError(req, res, session, error);
  }
}
export async function deleteAllChats(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const chats = await req.client.getAllChats();
    for (const chat of chats) {
      await req.client.deleteChat((chat as any).chatId);
    }
    res.status(200).json({ status: 'success' });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on delete all chats',
      error: error,
    });
  }
}

export async function clearChat(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     
     #swagger.requestBody = {
      required: false,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
              }
            },
          }
        }
      }
     }
   */
  const { phone } = req.body;
  const session = req.session;

  try {
    const results: any = {};
    for (const contato of phone) {
      results[contato] = await req.client.clearChat(contato);
    }
    returnSucess(res, session, phone, results);
  } catch (error) {
    returnError(req, res, session, error);
  }
}

export async function clearAllChats(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const chats = await req.client.getAllChats();
    for (const chat of chats) {
      await req.client.clearChat(`${(chat as any).chatId}`);
    }
    res.status(201).json({ status: 'success' });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on clear all chats', error: e });
  }
}

export async function archiveChat(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     
     #swagger.requestBody = {
      required: false,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              value: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                value: true,
              }
            },
          }
        }
      }
     }
   */
  const { phone, value = true } = req.body;

  try {
    const response = await req.client.archiveChat(`${phone}`, value);
    res.status(201).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on archive chat', error: e });
  }
}

export async function archiveAllChats(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const chats = await req.client.getAllChats();
    for (const chat of chats) {
      await req.client.archiveChat(`${(chat as any).chatId}`, true);
    }
    res.status(201).json({ status: 'success' });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error on archive all chats',
      error: e,
    });
  }
}

export async function getAllChatsArchiveds(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Chat"]
   * #swagger.description = 'Retrieves all archived chats.'
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const chats = await req.client.getAllChats();
    const archived = [] as any;
    for (const chat of chats) {
      if (chat.archive === true) {
        archived.push(chat);
      }
    }
    res.status(201).json(archived);
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error on archive all chats',
      error: e,
    });
  }
}
export async function deleteMessage(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     
     #swagger.requestBody = {
      required: false,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              messageId: { type: "string" },
              onlyLocal: { type: "boolean" },
              deleteMediaInDevice: { type: "boolean" },
            }
          },
          examples: {
            "Delete message to all": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                messageId: "<messageId>",
                deleteMediaInDevice: true,
              }
            },
            "Delete message only me": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                messageId: "<messageId>",
              }
            },
          }
        }
      }
     }
   */
  const { phone, messageId, deleteMediaInDevice, onlyLocal } = req.body;

  try {
    const result = await req.client.deleteMessage(
      `${phone}`,
      messageId,
      onlyLocal,
      deleteMediaInDevice
    );
    if (result) {
      res
        .status(200)
        .json({ status: 'success', response: { message: 'Message deleted' } });
    }
    res.status(401).json({
      status: 'error',
      response: { message: 'Error unknown on delete message' },
    });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on delete message', error: e });
  }
}
export async function reactMessage(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: false,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              msgId: { type: "string" },
              reaction: { type: "string" },
            }
          },
          examples: {
            "Default": {
              value: {
                msgId: "<messageId>",
                reaction: "😜",
              }
            },
          }
        }
      }
     }
   */
  const { msgId, reaction } = req.body;

  try {
    await req.client.sendReactionToMessage(msgId, reaction);

    res
      .status(200)
      .json({ status: 'success', response: { message: 'Reaction sended' } });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error on send reaction to message',
      error: e,
    });
  }
}

export async function reply(req: Request, res: Response) {
  /**
   * #swagger.deprecated=true
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              messageid: { type: "string" },
              text: { type: "string" },
            }
          },
          examples: {
            "Default": {
              value: {
              phone: "5521999999999",
              isGroup: false,
              messageid: "<messageId>",
              text: "Text to reply",
              }
            },
          }
        }
      }
     }
   */
  const { phone, text, messageid } = req.body;

  try {
    const response = await req.client.reply(`${phone}@c.us`, text, messageid);
    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error replying message', error: e });
  }
}

export async function forwardMessages(req: Request, res: Response) {
  /**
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              messageId: { type: "string" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                messageId: "<messageId>",
              }
            },
          }
        }
      }
     }
   */
  const { phone, messageId, isGroup = false } = req.body;

  try {
    let response;

    if (!isGroup) {
      response = await req.client.forwardMessage(`${phone[0]}`, messageId);
    } else {
      response = await req.client.forwardMessage(`${phone[0]}`, messageId);
    }

    res.status(201).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error forwarding message', error: e });
  }
}

export async function markUnseenMessage(req: Request, res: Response) {
  /**
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
              }
            },
          }
        }
      }
     }
   */
  const { phone } = req.body;

  try {
    await req.client.markUnseenMessage(`${phone}`);
    res
      .status(200)
      .json({ status: 'success', response: { message: 'unseen checked' } });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on mark unseen', error: e });
  }
}

export async function blockContact(req: Request, res: Response) {
  /**
     #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
              phone: "5521999999999",
              isGroup: false,
              }
            },
          }
        }
      }
     }
   */
  const { phone } = req.body;

  try {
    await req.client.blockContact(`${phone}`);
    res
      .status(200)
      .json({ status: 'success', response: { message: 'Contact blocked' } });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on block contact', error: e });
  }
}

export async function unblockContact(req: Request, res: Response) {
  /**
     #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
              phone: "5521999999999",
              isGroup: false,
              }
            },
          }
        }
      }
     }
   */
  const { phone } = req.body;

  try {
    await req.client.unblockContact(`${phone}`);
    res
      .status(200)
      .json({ status: 'success', response: { message: 'Contact UnBlocked' } });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on unlock contact', error: e });
  }
}

export async function pinChat(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["obj"] = {
      in: 'body',
      schema: {
        $phone: '5521999999999',
        $isGroup: false,
        $state: true,
      }
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              state: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
              phone: "5521999999999",
              state: true,
              }
            },
          }
        }
      }
     }
   */
  const { phone, state } = req.body;

  try {
    for (const contato of phone) {
      await req.client.pinChat(contato, state === 'true', false);
    }

    res
      .status(200)
      .json({ status: 'success', response: { message: 'Chat fixed' } });
  } catch (e: any) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: e.text || 'Error on pin chat',
      error: e,
    });
  }
}

export async function setProfilePic(req: Request, res: Response) {
  /**
     #swagger.tags = ["Profile"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.consumes = ['multipart/form-data']  
      #swagger.parameters['file'] = {
          in: 'formData',
          type: 'file',
          required: 'true',
      }
   */
  if (!req.file)
    res
      .status(400)
      .json({ status: 'Error', message: 'File parameter is required!' });

  try {
    const { path: pathFile } = req.file as any;

    await req.client.setProfilePic(pathFile);
    await unlinkAsync(pathFile);

    res.status(200).json({
      status: 'success',
      response: { message: 'Profile photo successfully changed' },
    });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error changing profile photo',
      error: e,
    });
  }
}

export async function getUnreadMessages(req: Request, res: Response) {
  /**
     #swagger.deprecated=true
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const response = await req.client.getUnreadMessages(false, false, true);
    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', response: 'Error on open list', error: e });
  }
}

export async function getChatIsOnline(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999',
     }
   */
  const { phone } = req.params;
  try {
    const response = await req.client.getChatIsOnline(`${phone}@c.us`);
    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      response: 'Error on get chat is online',
      error: e,
    });
  }
}

export async function getLastSeen(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999',
     }
   */
  const { phone } = req.params;
  try {
    const response = await req.client.getLastSeen(`${phone}@c.us`);

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      response: 'Error on get chat last seen',
      error: error,
    });
  }
}

export async function getListMutes(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["type"] = {
      schema: 'all',
     }
   */
  const { type = 'all' } = req.params;
  try {
    const response = await req.client.getListMutes(type);

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      response: 'Error on get list mutes',
      error: error,
    });
  }
}

export async function loadAndGetAllMessagesInChat(req: Request, res: Response) {
  /**
     #swagger.deprecated=true
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999'
     }
     #swagger.parameters["includeMe"] = {
      schema: 'true'
     }
     #swagger.parameters["includeNotifications"] = {
      schema: 'false'
     }
   */
  const { phone, includeMe = true, includeNotifications = false } = req.params;
  try {
    const response = await req.client.loadAndGetAllMessagesInChat(
      `${phone}@c.us`,
      includeMe as boolean,
      includeNotifications as boolean
    );

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res
      .status(500)
      .json({ status: 'error', response: 'Error on open list', error: error });
  }
}
export async function getMessages(req: Request, res: Response) {
  /**
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999@c.us'
     }
     #swagger.parameters["count"] = {
      schema: '20'
     }
     #swagger.parameters["direction"] = {
      schema: 'before'
     }
     #swagger.parameters["id"] = {
      schema: '<message_id_to_use_direction>'
     }
   */
  const { phone } = req.params;
  const { count = 20, direction = 'before', id = null } = req.query;
  try {
    const response = await req.client.getMessages(`${phone}`, {
      count: parseInt(count as string),
      direction: direction.toString() as any,
      id: id as string,
    });
    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res
      .status(401)
      .json({ status: 'error', response: 'Error on open list', error: e });
  }
}

export async function sendContactVcard(req: Request, res: Response) {
  /**
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              name: { type: "string" },
              contactsId: { type: "array" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                name: 'Name of contact',
                contactsId: ['5521999999999'],
              }
            },
          }
        }
      }
     }
   */
  const { phone, contactsId, name = null, isGroup = false } = req.body;
  try {
    let response;
    for (const contato of contactToArray(phone, isGroup)) {
      response = await req.client.sendContactVcard(
        `${contato}`,
        contactsId,
        name
      );
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on send contact vcard',
      error: error,
    });
  }
}

export async function sendMute(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
    #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              time: { type: "number" },
              type: { type: "string" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                time: 1,
                type: 'hours',
              }
            },
          }
        }
      }
     }
   */
  const { phone, time, type = 'hours', isGroup = false } = req.body;

  try {
    let response;
    for (const contato of contactToArray(phone, isGroup)) {
      response = await req.client.sendMute(`${contato}`, time, type);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on send mute', error: error });
  }
}

export async function sendSeen(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
              }
            },
          }
        }
      }
     }
   */
  const { phone } = req.body;
  const session = req.session;

  try {
    const results: any = [];
    for (const contato of phone) {
      results.push(await req.client.sendSeen(contato));
    }
    returnSucess(res, session, phone, results);
  } catch (error) {
    returnError(req, res, session, error);
  }
}

export async function setChatState(req: Request, res: Response) {
  /**
     #swagger.deprecated=true
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              chatstate: { type: "string" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                chatstate: "1",
              }
            },
          }
        }
      }
     }
   */
  const { phone, chatstate, isGroup = false } = req.body;

  try {
    let response;
    for (const contato of contactToArray(phone, isGroup)) {
      response = await req.client.setChatState(`${contato}`, chatstate);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on send chat state',
      error: error,
    });
  }
}

export async function setTemporaryMessages(req: Request, res: Response) {
  /**
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              value: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                value: true,
              }
            },
          }
        }
      }
     }
   */
  const { phone, value = true, isGroup = false } = req.body;

  try {
    let response;
    for (const contato of contactToArray(phone, isGroup)) {
      response = await req.client.setTemporaryMessages(`${contato}`, value);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on set temporary messages',
      error: error,
    });
  }
}

export async function setTyping(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              value: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                value: true,
              }
            },
          }
        }
      }
     }
   */
  const { phone, value = true, isGroup = false } = req.body;
  try {
    let response;
    for (const contato of contactToArray(phone, isGroup)) {
      if (value) response = await req.client.startTyping(contato);
      else response = await req.client.stopTyping(contato);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on set typing', error: error });
  }
}

export async function setRecording(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              phone: { type: "string" },
              isGroup: { type: "boolean" },
              duration: { type: "number" },
              value: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                phone: "5521999999999",
                isGroup: false,
                duration: 5,
                value: true,
              }
            },
          }
        }
      }
     }
   */
  const { phone, value = true, duration, isGroup = false } = req.body;
  try {
    let response;
    for (const contato of contactToArray(phone, isGroup)) {
      if (value) response = await req.client.startRecording(contato, duration);
      else response = await req.client.stopRecoring(contato);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on set recording',
      error: error,
    });
  }
}

export async function checkNumberStatus(req: Request, res: Response) {
  /**
     #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999'
     }
   */
  const { phone } = req.params;
  try {
    let response;
    for (const contato of contactToArray(phone, false)) {
      response = await req.client.checkNumberStatus(`${contato}`);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on check number status',
      error: error,
    });
  }
}

export async function getContact(req: Request, res: Response) {
  /**
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999'
     }
   */
  const { phone = true } = req.params;
  try {
    let response;
    for (const contato of contactToArray(phone as string, false)) {
      response = await req.client.getContact(contato);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on get contact', error: error });
  }
}

export async function getAllContacts(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Contact"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
   */
  try {
    const response = await req.client.getAllContacts();

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on get all constacts',
      error: error,
    });
  }
}

export async function getNumberProfile(req: Request, res: Response) {
  /**
     #swagger.deprecated=true
     #swagger.tags = ["Chat"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999'
     }
   */
  const { phone = true } = req.params;
  try {
    let response;
    for (const contato of contactToArray(phone as string, false)) {
      response = await req.client.getNumberProfile(contato);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on get number profile',
      error: error,
    });
  }
}

export async function getProfilePicFromServer(req: Request, res: Response) {
  /**
     #swagger.tags = ["Contact"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999'
     }
   */
  const { phone = true } = req.params;
  const { isGroup = false } = req.query;
  try {
    let response;
    for (const contato of contactToArray(phone as string, isGroup as boolean)) {
      response = await req.client.getProfilePicFromServer(contato);
    }

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on  get profile pic',
      error: error,
    });
  }
}

export async function getStatus(req: Request, res: Response) {
  /**
     #swagger.tags = ["Contact"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["phone"] = {
      schema: '5521999999999'
     }
   */
  const { phone = true } = req.params;
  try {
    let response;
    for (const contato of contactToArray(phone as string, false)) {
      response = await req.client.getStatus(contato);
    }
    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on  get status', error: error });
  }
}

export async function setProfileStatus(req: Request, res: Response) {
  /**
     #swagger.tags = ["Profile"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["obj"] = {
      in: 'body',
      schema: {
        $status: 'My new status',
      }
     }
     
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: { type: "string" },
            }
          },
          examples: {
            "Default": {
              value: {
                status: "My new status",
              }
            },
          }
        }
      }
     }
   */
  const { status } = req.body;
  try {
    const response = await req.client.setProfileStatus(status);

    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on set profile status' });
  }
}
export async function rejectCall(req: Request, res: Response) {
  /**
     #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              callId: { type: "string" },
            }
          },
          examples: {
            "Default": {
              value: {
                callId: "<callid>",
              }
            },
          }
        }
      }
     }
   */
  const { callId } = req.body;
  try {
    const response = await req.client.rejectCall(callId);

    res.status(200).json({ status: 'success', response: response });
  } catch (e) {
    req.logger.error(e);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on rejectCall', error: e });
  }
}

export async function starMessage(req: Request, res: Response) {
  /**
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.requestBody = {
      required: true,
      "@content": {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              messageId: { type: "string" },
              star: { type: "boolean" },
            }
          },
          examples: {
            "Default": {
              value: {
                messageId: "5521999999999",
                star: true,
              }
            },
          }
        }
      }
     }
   */
  const { messageId, star = true } = req.body;
  try {
    const response = await req.client.starMessage(messageId, star);

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on  start message',
      error: error,
    });
  }
}

export async function getReactions(req: Request, res: Response) {
  /**
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["messageId"] = {
      schema: '<messageId>'
     }
   */
  const messageId = req.params.id;
  try {
    const response = await req.client.getReactions(messageId);

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Error on get reactions',
      error: error,
    });
  }
}

export async function getVotes(req: Request, res: Response) {
  /**
     #swagger.tags = ["Messages"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["messageId"] = {
      schema: '<messageId>'
     }
   */
  const messageId = req.params.id;
  try {
    const response = await req.client.getVotes(messageId);

    res.status(200).json({ status: 'success', response: response });
  } catch (error) {
    req.logger.error(error);
    res
      .status(500)
      .json({ status: 'error', message: 'Error on get votes', error: error });
  }
}
// FUNCOES CHATWOOT
// === HELPERS MÍNIMOS PARA CHATWOOT ===

// Ajuste de timeouts da Page/CDP (Puppeteer)
export function adjustPageTimeouts(client: any, logger?: any) {
  try {
    if (client?.page?.setDefaultTimeout) client.page.setDefaultTimeout(300000); // 5 min
    if (client?.page?.setDefaultNavigationTimeout) client.page.setDefaultNavigationTimeout(300000);
    const cdp = (client?.page as any)?._client?.();
    const conn = cdp?.connection?.();
    if (typeof conn?.setProtocolTimeout === 'function') conn.setProtocolTimeout(300000);
    logger?.info?.('[chatwoot] timeouts ajustados', { protocolTimeout: 300000 });
  } catch (e: any) {
    logger?.warn?.('[chatwoot] falha ao ajustar timeouts', { err: String(e?.message ?? e) });
  }
}

// Detecta se o anexo é vídeo (usado apenas para escolher o fluxo de envio)
export function isVideoAttachment(att: any, contentType?: string, name?: string): boolean {
  const t = String(att?.file_type || '').toLowerCase();
  const ct = String(contentType || '').toLowerCase();
  const n = String(name || att?.filename || '').toLowerCase();
  if (t === 'video') return true;
  if (ct.startsWith('video/')) return true;
  return /\.(mp4|m4v|mov|3gp|webm|mkv|avi)$/i.test(n);
}

// Transcodifica para MP4 (H.264/AAC) com flags compatíveis com WhatsApp Web
export async function transcodeToMp4(inputPath: string): Promise<string> {
  const outPath = inputPath.toLowerCase().endsWith('.mp4') ? inputPath : `${inputPath}.mp4`;
  await new Promise<void>((resolve, reject) => {
    const args = [
      '-y', '-i', inputPath,
      // vídeo: limita largura a 1280, garante dimensões pares, H.264 yuv420p, faststart
      '-vf', "scale='min(1280,iw)':'-2',pad=ceil(iw/2)*2:ceil(ih/2)*2",
      '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'main', '-level', '3.1',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-crf', '23',
      // áudio: AAC 48 kHz
      '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
      outPath,
    ];
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
  return outPath;
}

// Concatena arquivo em base64 (para fallback via Data URL)
export async function fileToBase64(filePath: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const rs = createReadStream(filePath); // NÃO setar .setEncoding()
    rs.on('data', (chunk: unknown) => {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      else chunks.push(Buffer.from(String(chunk)));
    });
    rs.once('error', reject);
    rs.once('end', () => {
      try { resolve(Buffer.concat(chunks).toString('base64')); }
      catch (e) { reject(e); }
    });
  });
}

// (Opcional) utilitário para apagar arquivo sem quebrar fluxo
export async function safeUnlink(p: string) {
  try { await fsp.unlink(p); } catch {}
}


// ----- DEDUPE (10 min) ----- Corrigir erro de timeout no chatwoot
const CW_DEDUPE_TTL_MS = 10 * 60 * 1000;
const cwProcessedIds: Map<string, number> = new Map();

function cwSeen(id: string): boolean {
  const t = cwProcessedIds.get(id);
  return !!t && (Date.now() - t) < CW_DEDUPE_TTL_MS;
}
function cwRemember(id: string) {
  cwProcessedIds.set(id, Date.now());
  // limpeza oportunista
  const now = Date.now();
  for (const [k, v] of cwProcessedIds) {
    if (now - v > CW_DEDUPE_TTL_MS) cwProcessedIds.delete(k);
  }
}


// =================== FIM HELPERS (Topo do arquivo) ===================
// ===================== FUNCAO CHATWOOT =====================
export async function chatWoot(req: Request, res: Response): Promise<any> {
  const { session } = req.params as any;
  const client: any = clientsArray[session];

  // id da mensagem para dedupe (usa o que existir)
  const cwMsgId: string =
    String(req.body?.message?.id ?? req.body?.id ?? req.body?.message_id ?? '') || '';

  // Se já vimos essa mensagem recentemente, responde 200 e encerra
  if (cwMsgId && cwSeen(cwMsgId)) {
    try {
      return res.status(200).json({ status: 'duplicate', message_id: cwMsgId });
    } catch { /* ignore */ }
    return; // já respondido
  }

  // Marca como visto ANTES de processar para evitar corridas
  if (cwMsgId) cwRemember(cwMsgId);

  // ACK IMEDIATO para o Chatwoot (evita timeout no webhook)
  try {
    res.status(200).json({ status: 'queued', message_id: cwMsgId || null });
  } catch { /* ignore double-send */ }

  // ===== processamento em background =====
  setImmediate(async () => {
    try {
      if (!client || client.status !== 'CONNECTED' || !(await client.isConnected())) {
        req.logger?.warn?.('[chatwoot] sessão não conectada', { session, message_id: cwMsgId });
        return;
      }

      const event = req.body?.event;
      const is_private = req.body?.private || req.body?.is_private;
      const message_type = req.body?.message_type;

      // só processa "message_created" + "outgoing", ignora privados e status
      if (
        is_private ||
        event === 'conversation_status_changed' ||
        event === 'conversation_resolved' ||
        !(event === 'message_created' && message_type === 'outgoing')
      ) {
        req.logger?.info?.('[chatwoot] evento ignorado', { event, message_type, message_id: cwMsgId });
        return;
      }

      const phone =
        req.body?.conversation?.meta?.sender?.phone_number?.replace('+', '') ||
        req.body?.phone;

      if (!phone) {
        req.logger?.warn?.('[chatwoot] payload sem phone', { message_id: cwMsgId });
        return;
      }

      const message = req.body?.message || req.body?.conversation?.messages?.[0] || {};
      const caption: string = message?.content || '';

      // Ajusta timeouts para uploads grandes
      adjustPageTimeouts(client, req.logger);

      for (const contato of contactToArray(phone, false)) {
        if (message?.attachments && message.attachments.length > 0) {
          const att = message.attachments[0];

          // resolve URL (mesma lógica simples que você já está usando)
          const dataUrl = att?.data_url;
          const baseURL = (client?.config?.chatWoot?.baseURL || '').replace(/\/+$/, '');
          const downloadUrl =
            typeof dataUrl === 'string' && dataUrl.includes('/rails/')
              ? `${baseURL}/${dataUrl.substring(dataUrl.indexOf('/rails/') + 1)}`
              : att?.download_url || att?.url;

          if (!downloadUrl) {
            req.logger?.warn?.('[chatwoot] anexo sem URL resolvível', { message_id: cwMsgId, att });
            await client.sendText(`${contato}`, 'Não foi possível baixar o anexo.');
            continue;
          }

          req.logger?.info?.('[chatwoot] baixando anexo…', { to: contato, url: downloadUrl });

          // baixa para arquivo temp
          const filenameRaw = (att?.filename || '').trim();
          const filenameFromUrl = (downloadUrl.split('?')[0].split('/').pop() || 'file').trim();
          let filename = filenameRaw || filenameFromUrl;
          const filePath = join(tmpdir(), `${Date.now()}_${filename}`);
          const writer = createWriteStream(filePath);
          const response = await axios.get(downloadUrl, { responseType: 'stream' });
          await new Promise<void>((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
          req.logger?.info?.('[chatwoot] anexo baixado', { filePath, filename });

          try {
            // AUDIO → PTT
            if (String(att?.file_type).toLowerCase() === 'audio') {
              req.logger?.info?.('[chatwoot] enviando áudio (PTT)…', { to: contato, file: filePath });
              try {
                await client.sendPtt(`${contato}`, filePath, 'Voice Audio', caption);
                req.logger?.info?.('[chatwoot] sendPtt ok', { to: contato });
              } catch (err) {
                req.logger?.error?.('[chatwoot] sendPtt falhou', { to: contato, err: (err as any)?.message || err });
              }
              continue;
            }

            // VÍDEO (com fallback base64)
            if (
              String(att?.file_type).toLowerCase() === 'video' ||
              /\.(mp4|mov|mkv|avi)$/i.test(filename)
            ) {
              let pathToSend = filePath;
              let nameToSend = filename;

              // transcode para mp4 se necessário
              if (!nameToSend.toLowerCase().endsWith('.mp4')) {
                req.logger?.info?.('[chatwoot] transcodificando vídeo → MP4 (H.264/AAC)…', { filename: nameToSend });
                try {
                  const mp4Path = await transcodeToMp4(filePath);
                  pathToSend = mp4Path;
                  if (!nameToSend.toLowerCase().endsWith('.mp4')) nameToSend = `${nameToSend}.mp4`;
                  if (mp4Path !== filePath) {
                    try { unlinkSync(filePath); } catch {}
                  }
                } catch (transErr) {
                  req.logger?.error?.('[chatwoot] falha na transcodificação de vídeo', {
                    err: (transErr as any)?.message || transErr
                  });
                  // segue com original
                }
              }

              req.logger?.info?.('[chatwoot] enviando vídeo MP4…', { to: contato, nameToSend, pathToSend });
              try {
                await client.sendFile(`${contato}`, pathToSend, nameToSend, caption);
                req.logger?.info?.('[chatwoot] sendFile(video) ok', { to: contato });
              } catch (err) {
                req.logger?.error?.('[chatwoot] sendFile(video) falhou, tentando fallback base64…', {
                  to: contato, err: (err as any)?.message || err
                });
                try {
                  const b64 = await fileToBase64(pathToSend);
                  const mime = (att?.content_type && String(att.content_type).startsWith('video/'))
                    ? att.content_type
                    : 'video/mp4';
                  const data64 = `data:${mime};base64,${b64}`;
                  await client.sendFile(`${contato}`, data64, nameToSend, caption);
                  req.logger?.info?.('[chatwoot] sendFile(video, base64) ok', { to: contato });
                } catch (b64Err) {
                  req.logger?.error?.('[chatwoot] sendFile(video, base64) falhou', {
                    to: contato, err: (b64Err as any)?.message || b64Err
                  });
                }
              }
              continue;
            }

            // OUTROS TIPOS (imagem/pdf/etc)
            req.logger?.info?.('[chatwoot] enviando arquivo…', { to: contato, file: filePath, filename });
            try {
              await client.sendFile(`${contato}`, filePath, filename, caption);
              req.logger?.info?.('[chatwoot] sendFile(file) ok', { to: contato });
            } catch (err) {
              req.logger?.error?.('[chatwoot] sendFile(file) falhou, tentando fallback base64…', {
                to: contato, err: (err as any)?.message || err
              });
              try {
                const b64 = await fileToBase64(filePath);
                const mime = att?.content_type || 'application/octet-stream';
                const data64 = `data:${mime};base64,${b64}`;
                await client.sendFile(`${contato}`, data64, filename, caption);
                req.logger?.info?.('[chatwoot] sendFile(file, base64) ok', { to: contato });
              } catch (b64Err) {
                req.logger?.error?.('[chatwoot] sendFile(file, base64) falhou', {
                  to: contato, err: (b64Err as any)?.message || b64Err
                });
              }
            }
          } finally {
            try { unlinkSync(filePath); } catch {}
          }
        } else {
          // TEXTO
          req.logger?.info?.('[chatwoot] enviando texto…', { to: contato, content: caption });
          try {
            await client.sendText(`${contato}`, caption);
            req.logger?.info?.('[chatwoot] sendText ok', { to: contato });
          } catch (err) {
            req.logger?.error?.('[chatwoot] sendText falhou', { to: contato, err: (err as any)?.message || err });
          }
        }
      }
    } catch (e) {
      req.logger?.error?.('[chatwoot] erro no processamento assíncrono', { err: (e as any)?.message || e });
    }
  });
}

// ===================== FIM FUNCAO CHATWOOT =====================

export async function getPlatformFromMessage(req: Request, res: Response) {
  /**
   * #swagger.tags = ["Misc"]
     #swagger.autoBody=false
     #swagger.security = [{
            "bearerAuth": []
     }]
     #swagger.parameters["session"] = {
      schema: 'NERDWHATS_AMERICA'
     }
     #swagger.parameters["messageId"] = {
      schema: '<messageId>'
     }
   */
  try {
    const result = await req.client.getPlatformFromMessage(
      req.params.messageId
    );
    res.status(200).json(result);
  } catch (e) {
    req.logger.error(e);
    res.status(500).json({
      status: 'error',
      message: 'Error on get get platform from message',
      error: e,
    });
  }
}

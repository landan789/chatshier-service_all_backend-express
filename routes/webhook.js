
const express = require('express');
const wechat = require('wechat');
const bodyParser = require('body-parser');

const SOCKET_EVENTS = require('../config/socket-events');
/** @type {any} */
const ERROR = require('../config/error.json');

const chatshierHlp = require('../helpers/chatshier');
const storageHlp = require('../helpers/storage');
const socketHlp = require('../helpers/socket');
const oneSignalHlp = require('../helpers/onesignal');
const botSvc = require('../services/bot');

const appsMdl = require('../models/apps');
const appsChatroomsMdl = require('../models/apps_chatrooms');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
const consumersMdl = require('../models/consumers');
const usersOneSignalsMdl = require('../models/users_onesignals');

const webhooksLog = require('../logs/webhooks');

const router = express.Router();

const LINE = 'LINE';
const FACEBOOK = 'FACEBOOK';
const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';

const SKIP_PROCESS_APP = 'SKIP_PROCESS_APP';

const FACEBOOK_WEBHOOK_VERIFY_TOKEN = 'verify_token';
const WECHAT_WEBHOOK_VERIFY_TOKEN = 'verify_token';
const CHAT_COUNT_INTERVAL_TIME = 900000;

const NOTIFY_ICONS = {
    CHATSHIER: '/image/logo-no-transparent.png',
    DSDSDS: '/image/logo-dsdsds.png'
};

let webhookProcQueue = [];

router.get('/:webhookid', function(req, res) {
    // Facebook
    if (req.query['hub.verify_token']) {
        if (FACEBOOK_WEBHOOK_VERIFY_TOKEN === req.query['hub.verify_token']) {
            console.log('Facebook validating webhook');
            res.status(200).send(req.query['hub.challenge']);
        } else {
            console.error('Facebook failed validation. Make sure the validation tokens match.');
            res.sendStatus(500);
        }
        return;
    }

    // Wechat 驗證簽名
    if (req.query.signature && req.query.timestamp && req.query.nonce) {
        if (wechat.checkSignature(req.query, WECHAT_WEBHOOK_VERIFY_TOKEN)) {
            console.log('Wechat validating webhook');
            res.status(200).send(req.query.echostr);
        } else {
            console.error('Wechat failed validation.');
            res.sendStatus(500);
        }
        return;
    }
    !res.headersSent && res.sendStatus(500);
});

router.post('/:webhookid', (req, res, next) => {
    let webhookid = req.params.webhookid;

    let webhookPromise = Promise.all(webhookProcQueue).then(() => {
        if (!webhookid) {
            return Promise.reject(ERROR.APP_WEBHOOKID_WAS_EMPTY);
        }

        let apps;
        let logWebhookId;

        return Promise.resolve().then(() => {
            // 由於 Facebook 使用單一 app 來訂閱所有的粉絲專頁
            // 因此所有的 webhook 入口都會一致是 /webhook/facebook
            if (FACEBOOK === webhookid.toUpperCase()) {
                return new Promise((resolve) => {
                    bodyParser.json()(req, res, () => resolve());
                }).then(() => {
                    let webhook = {
                        url: req.hostname + req.originalUrl,
                        body: req.body
                    };
                    webhooksLog.start(webhook);

                    /** @type {Webhook.Facebook.Entry[]} */
                    let entries = req.body.entry || [];
                    let senderUid;
                    let recipientUid;

                    // 從 facebook 打過來的訊息中，抓取出發送者與接收者的 facebook uid
                    for (let i in entries) {
                        let messagings = entries[i].messaging || [];
                        for (let j in messagings) {
                            senderUid = messagings[j].sender.id;
                            recipientUid = messagings[j].recipient.id;
                            break;
                        }
                        break;
                    }

                    // 如果發送者與接收者的其中資料缺一，代表 webhook 傳過來的資料有誤
                    if (!(senderUid && recipientUid)) {
                        return Promise.reject(ERROR.INVALID_REQUEST_BODY_DATA);
                    }

                    // 發送者與接收者其中之一會是 facebook 粉絲專頁的 ID
                    // 因此使用發送者與接收者 facebook uid 來查找 app
                    let conditions = {
                        id1: { $in: [ senderUid, recipientUid ] },
                        isDeleted: false
                    };
                    return appsMdl.find(void 0, void 0, conditions).then((apps) => {
                        if (!apps || (apps && 0 === Object.keys(apps).length)) {
                            return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                        }
                        return Promise.resolve(apps);
                    });
                });
            }

            return appsMdl.find(void 0, webhookid).then((_apps) => {
                if (!_apps || (_apps && 0 === Object.keys(_apps).length)) {
                    // 找不到 app 時需回應 200
                    // 防止 facebook 收到非 200 回應時，會重新嘗試再傳送
                    !res.headersSent && res.status(200).send('');
                    return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                }

                // webhook 傳過來如果具有 webhookid 只會有一個 app 被找出來
                let appId = Object.keys(_apps).shift() || '';
                let app = _apps[appId];
                return botSvc.parser(req, res, appId, app).then(() => {
                    let webhook = {
                        url: req.hostname + req.originalUrl,
                        body: req.body
                    };
                    webhooksLog.start(webhook);
                    return Promise.resolve(_apps);
                });
            });
        }).then((_apps) => {
            apps = _apps;
            return Promise.all(Object.keys(apps).map((appId) => {
                let app = apps[appId];

                let receivedMessages = [];
                let repliedMessages = [];
                let totalMessages = [];
                let recipientUserIds = [];

                let fromPath;
                let toPath;
                let _messages;

                let webhookChatroomId = '';
                /** @type {Chatshier.Models.Consumers} */
                let consumers = {};

                let webhookInfo = botSvc.retrieveWebhookInfo(req, app);
                let replyToken = webhookInfo.replyToken || '';
                let eventType = webhookInfo.eventType;
                let platformUid = webhookInfo.platformUid;
                let platformGroupId = webhookInfo.platformGroupId;
                let platformGroupType = webhookInfo.platformGroupType;
                let isPostback = webhookInfo.isPostback;

                /** @type {Chatshier.Models.Messager} */
                let platformMessager;

                return botSvc.resolveSpecificEvent(webhookInfo, req, appId, app).then((shouldContinue) => {
                    if (!shouldContinue) {
                        return Promise.reject(SKIP_PROCESS_APP);
                    }

                    if (!platformUid) {
                        return Promise.resolve(null);
                    }

                    return Promise.all([
                        botSvc.getProfile(webhookInfo, appId, app),
                        consumersMdl.find(platformUid)
                    ]).then(([ profile, consumers ]) => {
                        if (!profile.photo) {
                            return consumersMdl.replace(platformUid, profile);
                        }

                        if (!consumers) {
                            return Promise.reject(ERROR.CONSUMER_FAILED_TO_FIND);
                        }

                        let consumer = consumers[platformUid];
                        let isUnsafe = profile && profile.photoOriginal.startsWith('http://');
                        let shouldUpdate = consumer && (consumer.photo.startsWith('http://') || profile.photoOriginal !== consumer.photoOriginal);

                        if (!consumer || shouldUpdate) {
                            if (isUnsafe) {
                                let fileName = `${platformUid}_${Date.now()}.jpg`;
                                let filePath = `${storageHlp.tempPath}/${fileName}`;
                                let _profile = Object.assign({}, profile);

                                return storageHlp.filesSaveUrl(filePath, profile.photoOriginal).then((url) => {
                                    _profile.photo = url;
                                    let toPath = `/consumers/${platformUid}/photo/${fileName}`;
                                    return storageHlp.filesMoveV2(filePath, toPath);
                                }).then(() => {
                                    return consumersMdl.replace(platformUid, _profile);
                                });
                            }
                            return consumersMdl.replace(platformUid, profile);
                        }

                        delete profile.photo;
                        return consumersMdl.replace(platformUid, profile);
                    });
                }).then((_consumers) => {
                    if (!_consumers) {
                        return Promise.resolve(null);
                    }
                    consumers = _consumers;

                    return Promise.resolve().then(() => {
                        if (!platformGroupId) {
                            return Promise.resolve(null);
                        }

                        // 根據平台的群組 ID 查找群組聊天室
                        return appsChatroomsMdl.findByPlatformGroupId(appId, platformGroupId, {}).then((appsChatrooms) => {
                            // 沒有找到此群組聊天室，則自動建立
                            if (!(appsChatrooms && appsChatrooms[appId])) {
                                let chatroom = {
                                    platformGroupId: platformGroupId,
                                    platformGroupType: platformGroupType
                                };
                                return appsChatroomsMdl.insert(appId, chatroom).then((_appsChatrooms) => {
                                    if (!(_appsChatrooms && _appsChatrooms[appId])) {
                                        return Promise.reject(ERROR.APP_CHATROOM_FAILED_TO_INSERT);
                                    }
                                    return Promise.resolve(_appsChatrooms);
                                });
                            }
                            return appsChatrooms;
                        }).then((appsChatrooms) => {
                            let chatrooms = appsChatrooms[appId].chatrooms;
                            let groupChatroomId = Object.keys(chatrooms).shift() || '';
                            webhookChatroomId = groupChatroomId;
                            return chatrooms[groupChatroomId];
                        });
                    }).then((groupChatroom) => {
                        let chatroomId = groupChatroom ? webhookChatroomId : void 0;

                        return appsChatroomsMessagersMdl.findByPlatformUid(appId, chatroomId, platformUid, !!groupChatroom).then((appsChatroomsMessagers) => {
                            // 如果平台用戶已屬於某個聊天室中並已存在，則直接與用其 messager 資訊
                            if (appsChatroomsMessagers && appsChatroomsMessagers[appId]) {
                                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                                let _chatroomId = Object.keys(chatrooms).shift() || '';
                                let messager = chatrooms[_chatroomId].messagers[platformUid];
                                webhookChatroomId = _chatroomId;

                                // 更新顧客的 follow 狀態
                                if (messager.isUnfollowed) {
                                    let messageId = messager._id;
                                    return appsChatroomsMessagersMdl.update(appId, _chatroomId, messageId, { isUnfollowed: false }).then((_appsChatroomsMessagers) => {
                                        if (!(_appsChatroomsMessagers && _appsChatroomsMessagers[appId])) {
                                            return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_UPDATE);
                                        }
                                        let _chatrooms = _appsChatroomsMessagers[appId].chatrooms;
                                        let _messager = _chatrooms[_chatroomId].messagers[messageId];
                                        platformMessager = _messager;

                                        let socketBody = {
                                            appId: appId,
                                            chatroomId: _chatroomId,
                                            messager: _messager,
                                            consumer: consumers[messager.platformUid]
                                        };

                                        return appsChatroomsMessagersMdl.find(appId, _chatroomId, void 0, CHATSHIER).then((__appsChatroomsMessagers) => {
                                            if (!(__appsChatroomsMessagers && __appsChatroomsMessagers[appId])) {
                                                return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                                            }

                                            let __chatrooms = __appsChatroomsMessagers[appId].chatrooms;
                                            let __messagers = __chatrooms[_chatroomId].messagers;

                                            let _recipientUserIds = Object.values(__messagers).map((__messager) => __messager.platformUid);
                                            return socketHlp.emitToAll(_recipientUserIds, SOCKET_EVENTS.CONSUMER_FOLLOW, socketBody).then(() => platformMessager);
                                        });
                                    });
                                }
                                platformMessager = messager;
                                return messager;
                            }

                            return Promise.resolve().then(() => {
                                if (!groupChatroom) {
                                    // 如果是非平台群組聊天室(單一 consumer)的話
                                    // 首次聊天室自動為其建立聊天室
                                    return appsChatroomsMdl.insert(appId).then((appsChatrooms) => {
                                        if (!(appsChatrooms && appsChatrooms[appId])) {
                                            return Promise.reject(ERROR.APP_CHATROOM_FAILED_TO_INSERT);
                                        }
                                        let chatrooms = appsChatrooms[appId].chatrooms;
                                        let chatroomId = Object.keys(chatrooms).shift() || '';
                                        webhookChatroomId = chatroomId;
                                        return Promise.resolve(appsChatrooms);
                                    });
                                }
                                return Promise.resolve(null);
                            }).then(() => {
                                // 自動建立聊天室後，將此訊息發送者加入
                                let messager = {
                                    type: app.type,
                                    platformUid: platformUid,
                                    lastTime: Date.now()
                                };

                                return appsChatroomsMessagersMdl.insert(appId, webhookChatroomId, messager).then((_appsChatroomsMessagers) => {
                                    if (!(_appsChatroomsMessagers && _appsChatroomsMessagers[appId])) {
                                        return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_INSERT);
                                    }
                                    let chatrooms = _appsChatroomsMessagers[appId].chatrooms;
                                    let messagers = chatrooms[webhookChatroomId].messagers;
                                    let messagerId = Object.keys(messagers).shift() || '';
                                    let _messager = messagers[messagerId];
                                    platformMessager = _messager;
                                    return Promise.resolve(_messager);
                                });
                            });
                        });
                    });
                }).then(() => {
                    if (!platformMessager) {
                        return [];
                    }
                    return botSvc.getReceivedMessages(req, res, platformMessager._id, appId, app);
                }).then((messages) => {
                    // webhook 不用處理聊天室的訊息時，不用查找回覆訊息
                    if (!webhookChatroomId) {
                        return [];
                    }

                    receivedMessages = messages;
                    if (receivedMessages.length > 0) {
                        fromPath = receivedMessages[0].fromPath;
                    }

                    if (isPostback) {
                        return chatshierHlp.getPostbackReplies(receivedMessages, webhookInfo, appId, botSvc);
                    }
                    return chatshierHlp.getMessageReplies(receivedMessages, webhookInfo, appId, app);
                }).then((messages) => {
                    repliedMessages = messages;
                    if (0 === repliedMessages.length) {
                        // 沒有回覆訊息的話代表此 webhook 沒有需要等待的非同步處理
                        // 因此在此直接將 webhook 的 http request 做 response
                        !res.headersSent && res.status(200).send('');
                        return;
                    };

                    // 因各平台處理方式不同
                    // 所以將 http request 做 response 傳入
                    // 待訊息回覆後直接做 http response
                    return botSvc.replyMessage(res, platformUid, replyToken, repliedMessages, appId, app);
                }).then(() => {
                    return chatshierHlp.getKeywordreplies(receivedMessages, appId);
                }).then((keywordreplies) => {
                    return Promise.all(keywordreplies.map((keywordreply) => {
                        return appsKeywordrepliesMdl.increaseReplyCount(appId, keywordreply._id);
                    }));
                }).then(() => {
                    if (LINE === app.type) {
                        if (botSvc.LINE_EVENT_TYPES.MESSAGE === eventType) {
                            totalMessages = receivedMessages.concat(repliedMessages);
                        } else {
                            totalMessages = repliedMessages;
                        }
                    } else {
                        totalMessages = receivedMessages.concat(repliedMessages);
                    }

                    if (0 === totalMessages.length) {
                        return [];
                    }

                    // 將整個聊天室群組成員的聊天狀態更新
                    return appsChatroomsMessagersMdl.find(appId, webhookChatroomId, void 0, CHATSHIER).then((appsChatroomsMessagers) => {
                        if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                            return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                        }

                        let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                        let messagers = chatrooms[webhookChatroomId].messagers;
                        return Promise.all(Object.keys(messagers).map((messagerId) => {
                            let recipientMsger = messagers[messagerId];
                            let recipientUserId = recipientMsger.platformUid;
                            recipientUserIds.push(recipientUserId);

                            // 更新最後聊天時間及計算聊天次數
                            let currentTime = Date.now();
                            let _messager = {
                                platformUid: recipientUserId,
                                chatCount: recipientMsger.chatCount ? recipientMsger.chatCount : 0,
                                lastTime: currentTime,
                                unRead: recipientMsger.unRead + totalMessages.length
                            };
                            if (recipientMsger.lastTime) {
                                let lastChatedTimeGap = currentTime - new Date(recipientMsger.lastTime).getTime();
                                if (CHAT_COUNT_INTERVAL_TIME <= lastChatedTimeGap) {
                                    _messager.chatCount++;
                                }
                            }
                            return appsChatroomsMessagersMdl.update(appId, webhookChatroomId, messagerId, _messager);
                        }));
                    });
                }).then(() => {
                    if (!(totalMessages.length > 0 && webhookChatroomId)) {
                        return Promise.resolve(null);
                    }

                    return appsChatroomsMessagesMdl.insert(appId, webhookChatroomId, totalMessages).then((appsChatroomsMessages) => {
                        if (!appsChatroomsMessages) {
                            return Promise.reject(ERROR.APP_CHATROOM_MESSAGE_FAILED_TO_INSERT);
                        }
                        return Promise.resolve(appsChatroomsMessages[appId].chatrooms[webhookChatroomId].messages);
                    });
                }).then((messages) => {
                    if (!messages) {
                        return;
                    }
                    _messages = messages;
                    let messageId = Object.keys(messages).shift() || '';
                    if (webhookChatroomId && messageId &&
                        messages[messageId] && messages[messageId].src.includes(storageHlp.sharedLinkPrefix) &&
                        SYSTEM !== messages[messageId].from) {
                        toPath = `/apps/${appId}/chatrooms/${webhookChatroomId}/messages/${messageId}/src${fromPath}`;
                        return storageHlp.filesMoveV2(fromPath, toPath);
                    }
                    return messages;
                }).then(() => {
                    if (!(webhookChatroomId &&
                        (_messages && Object.keys(_messages).length > 0) &&
                        recipientUserIds.length > 0)) {
                        return [];
                    }

                    // 抓出聊天室 messagers 最新的狀態傳給 socket
                    // 讓前端能夠更新目前 messager 的聊天狀態
                    return appsChatroomsMessagersMdl.find(appId, webhookChatroomId).then((appsChatroomsMessagers) => {
                        if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                            return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                        }

                        let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                        let chatroom = chatrooms[webhookChatroomId];

                        /** @type {ChatshierChatSocketBody} */
                        let messagesToSend = {
                            app_id: appId,
                            type: app.type,
                            chatroom_id: webhookChatroomId,
                            chatroom: chatroom,
                            senderUid: platformUid,
                            // 從 webhook 打過來的訊息，不能確定接收人是誰(因為是群組接收)
                            // 因此傳到 chatshier 聊天室裡不需要聲明接收人是誰
                            recipientUid: '',
                            consumers: consumers,
                            messages: Object.values(_messages)
                        };

                        return socketHlp.emitToAll(recipientUserIds, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messagesToSend).then(() => {
                            return socketHlp.getOfflineUserIds(recipientUserIds);
                        }).then((offlineUserIds) => {
                            if (0 === offlineUserIds.length) {
                                return [];
                            }

                            let options = {
                                userIds: offlineUserIds,
                                chatroomId: webhookChatroomId,
                                messages: _messages,
                                consumer: consumers[platformUid],
                                app: app,
                                hostname: req.hostname
                            };
                            return sendNotification(options);
                        });
                    });
                }).catch((err) => {
                    if (SKIP_PROCESS_APP === err) {
                        return Promise.resolve();
                    }
                    return Promise.reject(err);
                });
            }));
        });
    }).then(() => {
        let webhook = {
            url: req.hostname + req.originalUrl,
            body: req.body
        };
        webhooksLog.succed(webhook);
        return !res.headersSent && res.status(200).send('');
    }).catch((ERROR) => {
        let json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        console.error(ERROR);
        console.log(JSON.stringify(json, null, 4));
        console.trace(json);
        let webhook = {
            url: req.hostname + req.originalUrl,
            body: req.body
        };
        webhooksLog.fail(webhook);
        !res.headersSent && res.sendStatus(500);
    }).then(() => {
        let idx = webhookProcQueue.indexOf(webhookPromise);
        idx >= 0 && webhookProcQueue.splice(idx, 1);
    });
    webhookProcQueue.push(webhookPromise);
});

/**
 * @typedef NotificationOptions
 * @property {string[]} userIds
 * @property {string} chatroomId
 * @property {Chatshier.Models.Messages} messages
 * @property {Chatshier.Models.App} app
 * @property {Chatshier.Models.Consumer} consumer
 * @property {string} hostname
 * @param {NotificationOptions} options
 */
function sendNotification({ userIds, chatroomId, messages, app, consumer, hostname }) {
    return usersOneSignalsMdl.find({ userIds: userIds }).then((usersOneSignals) => {
        usersOneSignals = usersOneSignals || {};
        let oneSignalApps = {};
        for (let userId in usersOneSignals) {
            let oneSignals = usersOneSignals[userId].oneSignals;
            for (let oneSignalId in oneSignals) {
                let oneSignal = oneSignals[oneSignalId];
                let oneSignalAppId = oneSignal.oneSignalAppId;

                if (!oneSignalApps[oneSignalAppId]) {
                    oneSignalApps[oneSignalAppId] = [];
                }
                oneSignalApps[oneSignalAppId].push(oneSignal.oneSignalUserId);
            }
        }

        let messageIds = Object.keys(messages);
        let isDsdsds = hostname.indexOf('dsdsds.com.tw') >= 0;
        let notifyIcon = isDsdsds ? NOTIFY_ICONS.DSDSDS : NOTIFY_ICONS.CHATSHIER;
        return Promise.all(Object.keys(oneSignalApps).map((oneSignalAppId) => {
            let oneSignalUserIds = oneSignalApps[oneSignalAppId] || [];
            if (0 === oneSignalUserIds.length) {
                return Promise.resolve();
            }

            let nextMessage = (i) => {
                if (i >= messageIds.length) {
                    return Promise.resolve();
                }

                let messageId = messageIds[i];
                let message = messages[messageId];
                let isFromPlatform = LINE === message.from || FACEBOOK === message.from;
                if (!isFromPlatform) {
                    return nextMessage(i + 1);
                }

                return oneSignalHlp.createNotification(oneSignalAppId, {
                    app_id: oneSignalAppId,
                    headings: {
                        en: consumer.name + '【' + app.name + '】'
                    },
                    contents: {
                        en: message.text || '🔔(有新訊息)'
                    },
                    // 後面帶上 chatroomId 可使使用者點擊推播訊息後
                    // 前端在載入頁面完成後，可根據是哪個 chatroomId 直接將該 chatroom 開啟，提升使用者體驗
                    url: 'https://' + hostname + '/chat?chatroom_id=' + chatroomId,
                    large_icon: 'https://' + hostname + notifyIcon,
                    include_player_ids: oneSignalUserIds
                }).catch((err) => {
                    // 推播失敗時，打印錯誤但不擲出錯誤
                    console.error(err);
                }).then(() => {
                    return nextMessage(i + 1);
                });
            };
            return nextMessage(0);
        }));
    });
}

module.exports = router;

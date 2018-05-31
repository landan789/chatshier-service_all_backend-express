
const express = require('express');
const wechat = require('wechat');
const bodyParser = require('body-parser');

const SOCKET_EVENTS = require('../config/socket-events');
/** @type {any} */
const API_ERROR = require('../config/api_error.json');

const chatshierHlp = require('../helpers/chatshier');
const storageHlp = require('../helpers/storage');
const socketHlp = require('../helpers/socket');
const botSvc = require('../services/bot');

const appsMdl = require('../models/apps');
const appsChatroomsMdl = require('../models/apps_chatrooms');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
const consumersMdl = require('../models/consumers');
const groupsMembersMdl = require('../models/groups_members');

const router = express.Router();

const LINE = 'LINE';
const FACEBOOK = 'FACEBOOK';

const FACEBOOK_WEBHOOK_VERIFY_TOKEN = 'verify_token';
const WECHAT_WEBHOOK_VERIFY_TOKEN = 'verify_token';
const CHAT_COUNT_INTERVAL_TIME = 900000;

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
    }
});

router.post('/:webhookid', (req, res, next) => {
    let webhookid = req.params.webhookid;

    let webhookPromise = Promise.all(webhookProcQueue).then(() => {
        return Promise.resolve().then(() => {
            // 由於 Facebook 使用單一 app 來訂閱所有的粉絲專頁
            // 因此所有的 webhook 入口都會一致是 /webhook/facebook
            if (webhookid && FACEBOOK === webhookid.toUpperCase()) {
                !res.headersSent && res.status(200).send('');
                return Promise.reject(API_ERROR.APP_DID_NOT_EXIST);

                // return new Promise((resolve) => {
                //     bodyParser.json()(req, res, () => resolve());
                // }).then(() => {
                //     let entries = req.body.entry || [];
                //     let senderUid;
                //     let recipientUid;

                //     // 從 facebook 打過來的訊息中，抓取出發送者與接收者的 facebook uid
                //     for (let i in entries) {
                //         let messagings = entries[i].messaging || [];
                //         for (let j in messagings) {
                //             senderUid = messagings[j].sender.id;
                //             recipientUid = messagings[j].recipient.id;
                //             break;
                //         }
                //         break;
                //     }

                //     // 如果發送者與接收者的其中資料缺一，代表 webhook 傳過來的資料有誤
                //     if (!(senderUid && recipientUid)) {
                //         return Promise.reject(API_ERROR.INVALID_REQUEST_BODY_DATA);
                //     }

                //     // 發送者與接收者其中之一會是 facebook 粉絲專頁的 ID
                //     // 因此使用發送者與接收者 facebook uid 來查找 app
                //     let query = {
                //         id1: { $in: [senderUid, recipientUid] }
                //     };
                //     return appsMdl.find(null, null, query).then((apps) => {
                //         if (!apps || (apps && 0 === Object.keys(apps).length)) {
                //             return Promise.reject(API_ERROR.APP_DID_NOT_EXIST);
                //         }
                //         return apps;
                //     });
                // });
            }

            return appsMdl.find(null, webhookid).then((apps) => {
                if (!apps || (apps && 0 === Object.keys(apps).length)) {
                    // 找不到 app 時需回應 200
                    // 防止 facebook 收到非 200 回應時，會重新嘗試再傳送
                    !res.headersSent && res.status(200).send('');
                    return Promise.reject(API_ERROR.APP_DID_NOT_EXIST);
                }

                // webhook 傳過來如果具有 webhookid 只會有一個 app 被找出來
                let appId = Object.keys(apps).shift() || '';
                let app = apps[appId];
                return botSvc.parser(req, res, appId, app).then(() => apps);
            });
        }).then((apps) => {
            return Promise.all(Object.keys(apps).map((appId) => {
                let app = apps[appId];

                let receivedMessages = [];
                let repliedMessages = [];
                let totalMessages = [];

                let fromPath;
                let toPath;
                let _messages;

                let chatroomId;
                let consumers = {};

                let webhookInfo = botSvc.retrieveWebhookInfo(req, app);
                let platformMessager;

                return Promise.resolve().then(() => {
                    // Facebook 如果使用 "粉絲專頁收件夾" 或 "專頁小助手" 回覆時
                    // 如果有開啟 message_echoes 時，會收到 webhook 事件
                    if (webhookInfo.isEcho) {
                        // 如果是由我們自己的 Facebook app 發送的不需處理 echo
                        if (webhookInfo.platfromAppId) {
                            return;
                        }
                        return webhookInfo.platformUid && consumersMdl.find(webhookInfo.platformUid);
                    }

                    if (LINE === app.type) {
                        let isJoin = webhookInfo.eventType === botSvc.LINE_EVENT_TYPES.JOIN;
                        let isLeave = webhookInfo.eventType === botSvc.LINE_EVENT_TYPES.LEAVE;
                        let isUnfollow = webhookInfo.eventType === botSvc.LINE_EVENT_TYPES.UNFOLLOW;

                        // 如果 LINE 用戶封鎖 LINE@ 時，將聊天室中的 messager 的 isUnfollow 設為 true
                        // 來表示用戶已取消關注 LINE@, 此時無法傳送任何訊息給 LINE 用戶
                        if (isUnfollow) {
                            return appsChatroomsMessagersMdl.findByPlatformUid(appId, null, webhookInfo.platformUid).then((appsChatroomsMessagers) => {
                                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                                }

                                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                                let putMessagers = {
                                    isUnfollow: true
                                };

                                return Promise.all(Object.keys(chatrooms).map((_chatroomId) => {
                                    return appsChatroomsMessagersMdl.updateByPlatformUid(appId, _chatroomId, webhookInfo.platformUid, putMessagers).then((_appsChatroomsMessagers) => {
                                        if (!(_appsChatroomsMessagers && _appsChatroomsMessagers[appId])) {
                                            return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_UPDATE);
                                        }

                                        let socketBody = {
                                            appId: appId,
                                            chatroomId: _chatroomId,
                                            messager: _appsChatroomsMessagers[appId].chatrooms[_chatroomId].messagers[webhookInfo.platformUid]
                                        };
                                        return socketHlp.emitToAll(appId, SOCKET_EVENTS.CONSUMER_UNFOLLOW, socketBody);
                                    });
                                }));
                            }).then(() => void 0);
                        }

                        if (webhookInfo.platformGroupId) {
                            // 則根據平台的群組 ID 查找聊天室
                            // 若未找到記有群組 ID 的聊天室則自動建立一個聊天室
                            let platformGroupId = webhookInfo.platformGroupId;
                            let platformGroupType = webhookInfo.platformGroupType;

                            // 如果 LINE@ 被加入至群組時，會接收到 join 事件
                            // 此時建立一個聊天室，抓取群組內的所有成員的 profile 並加入至聊天室中，
                            if (isJoin) {
                                return appsChatroomsMdl.findByPlatformGroupId(appId, platformGroupId, {}).then((appsChatrooms) => {
                                    if (!(appsChatrooms && appsChatrooms[appId])) {
                                        let chatroom = {
                                            platformGroupId: platformGroupId,
                                            platformGroupType: platformGroupType
                                        };
                                        return appsChatroomsMdl.insert(appId, chatroom);
                                    }
                                    return appsChatrooms;
                                }).then((appsChatrooms) => {
                                    let chatrooms = appsChatrooms[appId].chatrooms;
                                    chatroomId = Object.keys(chatrooms).shift() || '';
                                    let chatroom = chatrooms[chatroomId];

                                    // 如果此群組聊天室存在但是已經離開過，則將此聊天室重新啟用
                                    if (chatroom.isDeleted) {
                                        return appsChatroomsMdl.update(appId, chatroomId, { isDeleted: false }).then((_appsChatrooms) => {
                                            if (!(_appsChatrooms && _appsChatrooms[appId])) {
                                                return Promise.reject(API_ERROR.APP_CHATROOMS_FAILED_TO_UPDATE);
                                            }
                                            chatroom = _appsChatrooms[appId].chatrooms[chatroomId];
                                            return chatroom;
                                        });
                                    }
                                    return chatroom;
                                }).then(() => {
                                    // 使用 LINE API 抓取群組內的所有的 LINE 成員用戶
                                    return botSvc.getGroupMemberIds(platformGroupId, appId, app).then((groupMemberIds) => {
                                        return Promise.all(groupMemberIds.map((groupMemberId) => {
                                            /** @type {Webhook.Chatshier.Information} */
                                            let _webhookInfo = {
                                                platformUid: groupMemberId,
                                                platformGroupId: platformGroupId,
                                                platformGroupType: platformGroupType
                                            };
                                            return botSvc.getProfile(_webhookInfo, appId, app).then((groupMemberProfile) => {
                                                return consumersMdl.replace(groupMemberId, groupMemberProfile);
                                            }).then(() => {
                                                let _messager = {
                                                    type: app.type,
                                                    platformUid: groupMemberId,
                                                    lastTime: Date.now(),
                                                    isDeleted: false
                                                };
                                                return appsChatroomsMessagersMdl.replace(appId, chatroomId, _messager);
                                            });
                                        }));
                                    });
                                }).then(() => void 0);
                            // 如果 LINE@ 被踢出群組或經由 API 自行離開時，會接收到 leave 事件
                            // 此時將 LINE@ 的群組聊天室刪除
                            } else if (isLeave) {
                                return appsChatroomsMdl.findByPlatformGroupId(appId, platformGroupId).then((appsChatrooms) => {
                                    if (!(appsChatrooms && appsChatrooms[appId])) {
                                        return;
                                    }

                                    let chatrooms = appsChatrooms[appId].chatrooms;
                                    chatroomId = Object.keys(chatrooms).shift() || '';
                                    return appsChatroomsMdl.remove(appId, chatroomId);
                                }).then(() => void 0);
                            }
                        }
                    }

                    return botSvc.getProfile(webhookInfo, appId, app).then((profile) => {
                        let platformUid = webhookInfo.platformUid;
                        if (!(profile && platformUid && !webhookInfo.isEcho)) {
                            return;
                        }
                        return consumersMdl.replace(platformUid, profile);
                    });
                }).then((_consumers) => {
                    if (!_consumers) {
                        return;
                    }
                    consumers = _consumers;

                    return Promise.resolve().then(() => {
                        let platformGroupId = webhookInfo.platformGroupId;
                        if (!platformGroupId) {
                            return;
                        }

                        // 根據平台的群組 ID 查找群組聊天室
                        return appsChatroomsMdl.findByPlatformGroupId(appId, platformGroupId, {}).then((appsChatrooms) => {
                            if (!(appsChatrooms && appsChatrooms[appId])) {
                                return Promise.reject(API_ERROR.APP_CHATROOMS_FAILED_TO_FIND);
                            }
                            let chatrooms = appsChatrooms[appId].chatrooms;
                            chatroomId = Object.keys(chatrooms).shift() || '';
                            return chatrooms[chatroomId];
                        });
                    }).then((groupChatroom) => {
                        chatroomId = groupChatroom ? chatroomId : void 0;
                        let platformUid = webhookInfo.platformUid;

                        return appsChatroomsMessagersMdl.findByPlatformUid(appId, chatroomId, platformUid, !!groupChatroom).then((appsChatroomsMessagers) => {
                            // 如果平台用戶已屬於某個聊天室中並已存在，則直接與用其 messager 資訊
                            if (appsChatroomsMessagers && appsChatroomsMessagers[appId]) {
                                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                                chatroomId = Object.keys(chatrooms).shift() || '';
                                let messager = chatrooms[chatroomId].messagers[platformUid];

                                // 更新顧客的 follow 狀態
                                if (messager.isUnfollow) {
                                    let messageId = messager._id;
                                    return appsChatroomsMessagersMdl.update(appId, chatroomId, messageId, { isUnfollow: false }).then((_appsChatroomsMessagers) => {
                                        if (!(_appsChatroomsMessagers && _appsChatroomsMessagers[appId])) {
                                            return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_UPDATE);
                                        }
                                        let _chatrooms = _appsChatroomsMessagers[appId].chatrooms;
                                        let _messager = _chatrooms[chatroomId].messagers[messageId];
                                        platformMessager = _messager;

                                        let socketBody = {
                                            appId: appId,
                                            chatroomId: chatroomId,
                                            messager: _messager
                                        };
                                        return socketHlp.emitToAll(appId, SOCKET_EVENTS.CONSUMER_FOLLOW, socketBody).then(() => _messager);
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
                                        let chatrooms = appsChatrooms[appId].chatrooms;
                                        chatroomId = Object.keys(chatrooms).shift() || '';
                                    });
                                }
                            }).then(() => {
                                // 自動建立聊天室後，將此訊息發送者加入
                                let messager = {
                                    type: app.type,
                                    platformUid: platformUid,
                                    lastTime: Date.now()
                                };

                                return appsChatroomsMessagersMdl.insert(appId, chatroomId, messager).then((_appsChatroomsMessagers) => {
                                    if (!(_appsChatroomsMessagers && _appsChatroomsMessagers[appId])) {
                                        return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_INSERT);
                                    }
                                    let chatrooms = _appsChatroomsMessagers[appId].chatrooms;
                                    let messagers = chatrooms[chatroomId].messagers;
                                    let messagerId = Object.keys(messagers).shift() || '';
                                    let _messager = messagers[messagerId];
                                    platformMessager = _messager;
                                    return _messager;
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
                    receivedMessages = messages;
                    if (receivedMessages.length > 0) {
                        fromPath = receivedMessages[0].fromPath;
                    }
                    return chatshierHlp.getRepliedMessages(receivedMessages, webhookInfo, appId, app);
                }).then((messages) => {
                    repliedMessages = messages;
                    if (0 === repliedMessages.length) {
                        // 沒有回覆訊息的話代表此 webhook 沒有需要等待的非同步處理
                        // 因此在此直接將 webhook 的 http request 做 response
                        !res.headersSent && res.status(200).send('');
                        return;
                    };
                    let replyToken = webhookInfo.replyToken || '';
                    let platformUid = webhookInfo.platformUid;

                    // 因各平台處理方式不同
                    // 所以將 http request 做 response 傳入
                    // 待訊息回覆後直接做 http response
                    return botSvc.replyMessage(res, platformUid, replyToken, repliedMessages, appId, app);
                }).then(() => {
                    return chatshierHlp.getKeywordreplies(receivedMessages, appId, app);
                }).then((keywordreplies) => {
                    return Promise.all(keywordreplies.map((keywordreply) => {
                        return appsKeywordrepliesMdl.increaseReplyCount(appId, keywordreply._id);
                    }));
                }).then(() => {
                    return groupsMembersMdl.findMembers(app.group_id, null, false, true);
                }).then((members) => {
                    if (!members) {
                        return [];
                    }

                    let eventType = webhookInfo.eventType;
                    if (botSvc.LINE_EVENT_TYPES.MESSAGE === eventType) {
                        totalMessages = receivedMessages.concat(repliedMessages);
                    } else {
                        totalMessages = repliedMessages;
                    }

                    if (0 === totalMessages.length) {
                        return [];
                    }

                    // 將整個聊天室群組成員的聊天狀態更新
                    return Promise.all(Object.keys(members).map((memberId) => {
                        let recipientUserId = members[memberId].user_id;

                        return appsChatroomsMessagersMdl.findByPlatformUid(appId, chatroomId, recipientUserId, true).then((appsChatroomsMessagers) => {
                            let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                            let messagers = chatrooms[chatroomId].messagers;
                            let recipientMsger = messagers[recipientUserId];

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
                            return appsChatroomsMessagersMdl.updateByPlatformUid(appId, chatroomId, recipientUserId, _messager);
                        });
                    }));
                }).then(() => {
                    if (!(totalMessages.length > 0 && chatroomId)) {
                        return;
                    }

                    return appsChatroomsMessagesMdl.insert(appId, chatroomId, totalMessages).then((appsChatroomsMessages) => {
                        if (!appsChatroomsMessages) {
                            return Promise.reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT);
                        };
                        return appsChatroomsMessages[appId].chatrooms[chatroomId].messages;
                    });
                }).then((messages) => {
                    if (!messages) {
                        return;
                    }
                    _messages = messages;
                    let messageId = Object.keys(messages).shift() || '';
                    if (chatroomId && messageId && messages[messageId] && messages[messageId].src.includes('dl.dropboxusercontent')) {
                        toPath = `/apps/${appId}/chatrooms/${chatroomId}/messages/${messageId}/src${fromPath}`;
                        return storageHlp.filesMoveV2(fromPath, toPath);
                    }
                    return messages;
                }).then(() => {
                    if (!(chatroomId && _messages && Object.keys(_messages).length > 0)) {
                        return;
                    }

                    // 抓出聊天室 messagers 最新的狀態傳給 socket
                    // 讓前端能夠更新目前 messager 的聊天狀態
                    return appsChatroomsMessagersMdl.find(appId, chatroomId).then((appsChatroomsMessagers) => {
                        let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                        let chatroom = chatrooms[chatroomId];

                        /** @type {ChatshierChatSocketBody} */
                        let messagesToSend = {
                            app_id: appId,
                            type: app.type,
                            chatroom_id: chatroomId,
                            chatroom: chatroom,
                            senderUid: webhookInfo.platformUid,
                            // 從 webhook 打過來的訊息，不能確定接收人是誰(因為是群組接收)
                            // 因此傳到 chatshier 聊天室裡不需要聲明接收人是誰
                            recipientUid: '',
                            consumers: consumers,
                            messages: Object.values(_messages)
                        };
                        return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messagesToSend);
                    });
                });
            }));
        });
    }).then(() => {
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
        !res.headersSent && res.sendStatus(500);
    }).then(() => {
        let idx = webhookProcQueue.indexOf(webhookPromise);
        idx >= 0 && webhookProcQueue.splice(idx, 1);
    });
    webhookProcQueue.push(webhookPromise);
});

module.exports = router;

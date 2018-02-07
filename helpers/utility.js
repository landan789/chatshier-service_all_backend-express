var utility = {};

utility.isUrl = str => {
    if (str.indexOf('.com') !== -1) return true;
    else if (str.indexOf('.edu') !== -1) return true;
    else if (str.indexOf('.net') !== -1) return true;
    else if (str.indexOf('.io') !== -1) return true;
    else if (str.indexOf('.org') !== -1) return true;
    return false;
}
utility.isSameUser = (profile, userId, channelId) => {
    return profile.userId == userId && profile.channelId == channelId;
}
utility.lineType = (bot, messageId, callback) => {
    let stream = bot.getMessageContent(messageId).then((chunk) => {
        console.log(chunk.client._tlsOptions.session);
        let buffer = chunk.client._tlsOptions.session;
        let msgObj = '<a href="data:image/png;base64,' + buffer.toString('base64') + '" ' +
            ' target="_blank" ><img src="data:image/png;base64,' + buffer.toString('base64') + '" ' +
            'width="20%" alt="image embedded using base64 encoding!"/></a>';
        callback(msgObj);
    });
}
utility.lineMsgType = (event, type, callback) => {
    let msgObj;
    switch (type) {
        case 'sticker':
            let stickerId = event.message.stickerId;
            msgObj = '<img src="https://sdl-stickershop.line.naver.jp/stickershop/v1/sticker/' + stickerId + '/android/sticker.png"' +
                'width="20%" alt="sticker cant display!"/>';
            break;
        case 'location':
            event.message.content().then(function(content) {
                let latitude = event.message.latitude;
                let longitude = event.message.longitude;
                msgObj = '<a target="_blank" href=" https://www.google.com.tw/maps/place/' + content.toString('base64') +
                    '/@' + latitude + ',' + longitude + ',15z/data=!4m5!3m4!1s0x0:0x496596e7748a5757!8m2!3d' +
                    latitude + '!4d' + longitude + '">' + event.message.address + '</a>';
            }).catch(function(error) {
                console.log('location error: ' + error);
            });
            break;
        case 'image':
            event.message.content().then(function(content) {
                msgObj = '<a href="data:image/png;base64,' + content.toString('base64') + '" ' +
                    ' target="_blank" ><img src="data:image/png;base64,' + content.toString('base64') + '" ' +
                    'width="20%" alt="image embedded using base64 encoding!"/></a>';
            }).catch(function(error) {
                console.log('image error: ' + error);
            });
            break;
        case 'audio':
            event.message.content().then(function(content) {
                msgObj = '<audio controls><source src="data:audio/mp4;base64,' + content.toString('base64') + '" ' +
                    '" type="audio/mp4"></audio>';
            }).catch(function(error) {
                console.log('audio error: ' + error);
            });
            break;
        case 'video':
            event.message.content().then(function(content) {
                msgObj = '<video controls><source src="data:video/mp4;base64,' + content.toString('base64') + '" ' +
                    '" type="video/mp4"></video>';
            }).catch(function(error) {
                console.log('video error: ' + error);
            });
            break;
        case 'text':
            let message_lineTochat = event.message.text; // line訊息內容
            if (URL(message_lineTochat)) {
                let urlStr = '<a href=';
                if (message_lineTochat.indexOf('http') === -1) {
                    urlStr += '"http://';
                }
                msgObj = urlStr + message_lineTochat + '/" target="_blank">' + message_lineTochat + '</a>';
            } else {
                msgObj = message_lineTochat;
            }
            break;
        default:
            console.log('type is none of the above, please check the code');
            break;
    }
    callback(msgObj);
}
utility.LINEMessageTypeForPushMessage = (vendor, callback) => {
    let message = {};
    switch (vendor.textType) {
        case 'text':
            message.text = vendor.msg;
            message.type = vendor.textType;
            break;
        case 'image':
            message.previewImageUrl = vendor.url;
            message.originalContentUrl = vendor.url;
            message.type = vendor.textType;
            break;
        case 'audio':
            message.duration = 240000;
            message.originalContentUrl = vendor.url;
            message.type = vendor.textType;
            break;
        case 'video':
            message.previewImageUrl = 'https://tinichats.com/assets/images/tab.png';
            message.originalContentUrl = vendor.url;
            message.type = vendor.textType;
            break;
        case 'sticker':
            message.stickerId = parseInt(vendor.msg.substr(vendor.msg.lastIndexOf(' ')));
            message.packageId = parseInt(vendor.msg.substr(vendor.msg.indexOf(' ')));
            message.type = vendor.textType;
            break;
    }
    callback(message);
};
utility.fbMsgType = (fbMsg, callback) => {
    let msgObj;
    if (fbMsg.attachments) {
        switch (fbMsg.attachments[0].type) {
            case "image":
                let imageURL = fbMsg.attachments[0].payload.url;
                msgObj = '<img src="' + imageURL + '" style="width: 100%; max-width: 500px;"/>';
                break;
            case "video":
                var videoURL = fbMsg.attachments[0].payload.url;
                msgObj = '<video controls><source src="' + videoURL + '" type="video/mp4"></video>';
                break;
            case "audio":
                var audioURL = fbMsg.attachments[0].payload.url;
                msgObj = '<audio controls><source src="' + audioURL + '" type="audio/mpeg"/></audio>';
                break;
            case "file":
                var fileURL = fbMsg.attachments[0].payload.url;
                msgObj = 'The user sent a file, click <a target="blank" href="' + fileURL + '">HERE</a> for download.';
                break;
            case "location":
                var locateURL = fbMsg.attachments[0].url;
                msgObj = 'The user sent a location, click <a target="blank" href="' + locateURL + '">HERE</a> for map link.';
                break;
            default:
                console.log('type is none of the above, please check the code');
                break;
        }
    } else {
        msgObj = fbMsg.text;
    }
    callback(msgObj);
}
utility.updateChannel = (chatInfo, callback) => {
    let channelObj;
    if (chatInfo) {
        channelObj = {
            name1: chatInfo.ids.name1,
            chanId_1: chatInfo.ids.chanId_1,
            name2: chatInfo.ids.name2,
            chanId_2: chatInfo.ids.chanId_2,
            fbName: chatInfo.ids.fbName,
            fbPageId: chatInfo.ids.fbPageId
        }
    } else {
        channelObj = {
            name1: '',
            chanId_1: '',
            name2: '',
            chanId_2: '',
            fbName: '',
            fbPageId: ''
        }
    }
    callback(channelObj)
}
utility.checkEachClient = (data, callback) => {
    data['list'].map(item => {
        callback(item['userId'], item['chanId']);
    });
}
utility.checkMessageLength = (data, callback) => {
    data['message'].map(item => {
        if (item !== '未設定') {
            callback(item);
        }
    });
}
utility.filterUser = (channelIdArr, chatData, callback) => {
    let newData = {};
    for (let i in chatData) {
        let profile = chatData[i].Profile;
        if (!profile) continue;
        let chanId = profile.channelId;
        if (channelIdArr.indexOf(chanId) !== -1) {
            newData[i] = chatData[i];
        }
    }
    callback(newData);
}

utility.DateTimezone = (offset) => {
    // 建立現在時間的物件
    let d = new Date();
    // 取得 UTC time
    let utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    // 新增不同時區的日期資料
    return new Date(utc + (3600000 * offset));
};

function URL(str) {
    if (str.indexOf('.com') !== -1) return true;
    else if (str.indexOf('.edu') !== -1) return true;
    else if (str.indexOf('.net') !== -1) return true;
    else if (str.indexOf('.io') !== -1) return true;
    else if (str.indexOf('.org') !== -1) return true;
    return false;
}
module.exports = utility;
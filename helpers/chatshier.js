module.exports = (function() {
    let appsTemplatesMdl = require('../models/apps_templates');
    let appsGreetingsMdl = require('../models/apps_greetings');
    let appsAutorepliesMdl = require('../models/apps_autoreplies');
    let appsKeywordrepliesMdl = require('../models/apps_keywordreplies');

    function ChatshierHelp() {};

    ChatshierHelp.prototype.findReplyMessages = function(){
    };
    /**
     * 處理要傳給 line 的 message 格式
     * @param {any} message
     * @returns {any} message
     */
    ChatshierHelp.prototype.toLineMessage = function(message) {
        let _message = {
            type: message.type
        };

        switch (message.type) {
            case 'text':
                _message.text = message.text;
                break;
            case 'image':
                _message.previewImageUrl = message.src;
                _message.originalContentUrl = message.src;
                break;
            case 'audio':
                _message.duration = 240000;
                _message.originalContentUrl = message.src;
                break;
            case 'video':
                _message.previewImageUrl = 'https://www.chatshier.com/image/chatshier_logo.png';
                _message.originalContentUrl = message.src;
                break;
            case 'sticker':
                _message.stickerId = message.text.substr(message.text.lastIndexOf(' '));
                _message.packageId = message.text.substr(message.text.indexOf(' '));
                break;
        }
        return _message;
    };
    
    return new ChatshierHelp();
})();
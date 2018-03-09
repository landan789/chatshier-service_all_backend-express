module.exports = (function() {
    let appsTemplatesMdl = require('../models/apps_templates');
    let appsGreetingsMdl = require('../models/apps_greetings');
    let appsAutorepliesMdl = require('../models/apps_autoreplies');
    let appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
    let chatshierCfg = require('../config/chatshier');

    const LINE = 'LINE';
    const FACEBOOK = ''
    function ChatshierHelp() {};

    /**
     * 根據 HTTP request body 與 app.type 決定要回傳甚麼訊息
     * @param {*} body 
     * @param {*} app 
     */
    ChatshierHelp.prototype.findReplyMessages = function(body, app) {
        switch (app.type) {
            case LINE:
                break;
            case FACEBOOK:
                break;
        }
    };
    return new ChatshierHelp();
})();
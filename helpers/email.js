module.exports = (function() {
    const os = require('os');
    const path = require('path');
    const nodemailer = require('nodemailer');
    const Email = require('email-templates');
    const chatshierCfg = require('../config/chatshier');

    class EmailHelper {
        constructor() {
            this.senderName = '錢掌櫃 Chatshier';
            this.sender = chatshierCfg.GMAIL.user;

            let hostname = os.hostname();
            let port = hostname.includes('fea.chatshier.com') ? ':3002' : '';
            this.serverAddr = 'http://service.' + hostname + port;

            this.smtpTransport = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'oauth2',
                    user: chatshierCfg.GMAIL.user,
                    clientId: chatshierCfg.GMAIL.clientId,
                    clientSecret: chatshierCfg.GMAIL.clientSecret,
                    refreshToken: chatshierCfg.GMAIL.refreshToken
                },
                tls: {
                    rejectUnauthorized: true
                }
            });

            this.emailCfg = {
                message: {
                    from: `"${this.senderName}" <${this.sender}>`
                },
                transport: this.smtpTransport,
                views: {
                    options: {
                        extension: 'ejs'
                    }
                },
                send: true, // 設為 false 時, 不會真的進行發送(開發時使用)
                preview: false // 設為 true 時, 發送時會自動另開分頁預覽 mail 內容(開發時使用)
            };
        }

        /**
         * @param {string} to - 接收者的 email
         * @param {string} token - Chatshier 使用者的 access token
         */
        sendResetPWMail(to, token) {
            let email = new Email(this.emailCfg);
            let params = {
                mailHeader: '重置您的密碼',
                mailDescription: '您告知我們您忘記了密碼，如果確實是您本人做了這件事，請點擊下方按鈕以重置您的密碼。',
                resetText: '重置密碼',
                buttonNotWork: '重置密碼按鈕無法動作？',
                copyDescription: '請拷貝以下連結貼至您的瀏覽器:',
                resetPasswordLink: this.serverAddr + '/api/sign/reset-password/' + token,
                signinText: '登入',
                signinLink: this.serverAddr + '/signin',
                copyright: 'Copyright© 2018 - 錢掌櫃 Chatshier'
            };

            return email.render('../emails/reset_password.ejs', params).then((emailHtml) => {
                let emailOpts = {
                    template: '',
                    message: {
                        to: to,
                        subject: '重置您的密碼',
                        html: emailHtml
                    },
                    locals: {}
                };

                return email.send(emailOpts);
            });
        }
    }

    return new EmailHelper();
})();

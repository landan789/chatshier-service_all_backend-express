module.exports = (function() {
    const nodemailer = require('nodemailer');
    const Email = require('email-templates');
    const CHATSHIER_CFG = require('../config/chatshier');

    class EmailHelper {
        constructor() {
            this.senderName = '錢掌櫃 Chatshier';
            this.sender = CHATSHIER_CFG.GMAIL.USER;

            this.smtpTransport = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'oauth2',
                    user: CHATSHIER_CFG.GMAIL.USER,
                    clientId: CHATSHIER_CFG.GMAIL.CLIENT_ID,
                    clientSecret: CHATSHIER_CFG.GMAIL.CLIENT_SECRET,
                    refreshToken: CHATSHIER_CFG.GMAIL.REFRESH_TOKEN
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
         * @param {string} serverAddr
         * @param {string} to - 接收者的 email
         * @param {string} token - Chatshier 使用者的 access token
         */
        sendResetPWMail(serverAddr, to, token) {
            let email = new Email(this.emailCfg);
            let params = {
                mailHeader: '重置您的密碼',
                mailDescription: '您告知我們您忘記了密碼，如果確實是您本人做了這件事，請點擊下方按鈕以重置您的密碼。',
                resetText: '重置密碼',
                buttonNotWork: '重置密碼按鈕無法動作？',
                copyDescription: '請拷貝以下連結貼至您的瀏覽器:',
                resetPasswordLink: serverAddr + '/change-password?j=' + token,
                signinText: '登入',
                signinLink: serverAddr + '/signin',
                copyright: 'Copyright© 2018 - 錢掌櫃 Chatshier'
            };

            return email.render('../templates/reset_email_password.ejs', params).then((emailHtml) => {
                /** @type {any} */
                let emailOpts = {
                    message: {
                        to: to,
                        subject: '重置您的密碼',
                        html: emailHtml
                    }
                };

                return email.send(emailOpts);
            });
        }
    }

    return new EmailHelper();
})();

const EXPIRES = (60 * 60 * 1000); // 1 hour -> 60 minutes * 60 seconds * 1000 milliseconds

module.exports = {
    API: {
        PORT: 3002
    },
    REDIS: {
        HOST: '127.0.0.1', // redis
        PORT: 6379,
        PASSWORD: 'dba1748eac27602147dfb1b06557a4fd'
    },
    STORAGE: {
        DROPBOX_ACCESS_TOKEN: 'DJzCRts8daAAAAAAAAAABnNeJJuJiYqx51BL3jrees0iA3Inz_Xu14eoRCQ8KD25'
    },
    MONGODB: {
        HOST: '127.0.0.1', // mongodb
        PORT: 27017,
        DATABASE: 'chatshier',
        USERNAME: 'chsr',
        PASSWORD: '0be44b96e3decd6a6b30cdb30c126089'
    },
    LOG: {
        PATH: '.log'
    },
    LINE: {
        PREVIEW_IMAGE_URL: 'https://service.dev.chatshier.com/image/logo-no-transparent.png',
        // LINE 的 App 會根據行動裝置存取 5 種不同的解析度圖像
        // 可能存取的像素值有240px, 300px, 460px, 700px, 1040px，例如:
        // [FILE_IMAGE_BASE_URL]/1040
        // [FILE_IMAGE_BASE_URL]/700
        // https://developers.line.me/en/reference/messaging-api/#base-url
        FILE_IMAGE_BASE_URL: 'https://service.dev.chatshier.com/image/download'
    },
    FACEBOOK: {
        // https://developers.facebook.com/apps
        appId: '1569929989761572',
        appSecret: '8e21836de6f01a6a5d1d0876e4f2c1d1',
        appAccessToken: 'd83ed3a87f6aef9eb7982e5ef5acb187',
        apiVersion: 'v3.0'
    },
    GOOGLE: {
        serverAPIKey: 'AIzaSyDvAQBzctZSnaUeJWZlbeng7JFjV4lEmL4',
        // https://www.google.com/recaptcha/admin
        recaptchaSecretKey: '6LecPVgUAAAAAIkVg1b-J1_og56i0GlEg-8ivM8x',
        // owner: 9thflr.RD@gmail.com
        // https://console.firebase.google.com/u/0/project/chatshier-d4dfd/settings/general/
        FDLdomain: 'chatshier9450.page.link'
    },
    JWT: {
        EXPIRES: EXPIRES,
        SUBJECT: 'support@chatshier.com',
        ISSUER: 'support@chatshier.com',
        AUDIENCE: 'chatshier.com',
        SECRET: 'ilovechatshier'
    },
    CRYPTO: {
        ALGORITHM: 'sha1',
        SECRET: 'ilovechatshier'
    },
    COOKIE: {
        EXPIRES: EXPIRES
    },
    CORS: { // the attributes of CORS must be lower case
        origin: [
            'http://service.fea.chatshier.com:8080' // allow the website of client can access back-end service.chatshier
            // http://service.fea.chatshier.com:3002  website always allows itself
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    },
    GMAIL: {
        user: 'support@chatshier.com',
        // https://developers.google.com/oauthplayground
        clientId: '1074711200692-ds4lin2uh3q4bs5doqsdipuak83j6te1.apps.googleusercontent.com',
        clientSecret: '91Bn0GnAEnGuJRWj_9Im-_oq',
        // Google 所配發的 refreshToken 不會失效，會失效可能是以下原因
        // 1. 使用者解除授權 app
        // 2. 使用者授權 app 時，授權的 scope 發生變更
        refreshToken: '1/rBgB_AywuhwQuZpqnYSAfqtVK8u5ll6Vp2S-XDaLY2hzDFEHIU9C9wNXHivtmo-X'
    },
    PAYMENT: {
        MODE: 'TEST' // payment
    }
};

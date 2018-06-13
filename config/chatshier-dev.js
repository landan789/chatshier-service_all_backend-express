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
    ELASTICSEARCH: {
        HOST: '127.0.0.1',
        PORT: 9200,
        USERNAME: 'chsr',
        PASSWORD: '0be44b96e3decd6a6b30cdb30c126089',
        INDEX: 'log' // INDEX of ELASTICSEARCH is simalir to DATABASE of MONGODB
    },
    LOG: {
        PATH: '.log'
    },
    LINE: {
        PREVIEW_IMAGE_URL: 'https://service.chatshier.com/image/logo-no-transparent.png'
    },
    FACEBOOK: {
        // https://developers.facebook.com/apps
        appId: '178381762879392',
        appSecret: '27aad72319bf154c059f696bce055ac2',
        appAccessToken: '8eeabaf3c836d295edb26264ec76e975',
        apiVersion: 'v3.0'
    },
    GOOGLE: {
        // https://www.google.com/recaptcha/admin
        recaptchaSecretKey: '6LecPVgUAAAAAIkVg1b-J1_og56i0GlEg-8ivM8x'
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
    }
};

const EXPIRES = (60 * 60 * 1000); // 1 hour -> 60 minutes * 60 seconds * 1000 milliseconds

module.exports = {
    REDIS: {
        HOST: '127.0.0.1',
        PORT: 6379,
        PASSWORD: 'dba1748eac27602147dfb1b06557a4fd'
    },
    STORAGE: {
        DROPBOX_ACCESS_TOKEN: 'DJzCRts8daAAAAAAAAAABnNeJJuJiYqx51BL3jrees0iA3Inz_Xu14eoRCQ8KD25'
    },
    MONGODB: {
        HOST: '127.0.0.1',
        PORT: 27017,
        DATABASE: 'chatshier',
        USERNAME: 'chsr',
        PASSWORD: '0be44b96e3decd6a6b30cdb30c126089'
    },
    LINE: {
        PREVIEW_IMAGE_URL: 'https://www.chatshier.com/image/chatshier_logo.png'
    },
    FACEBOOK: {
        // https://developers.facebook.com/apps
        appId: '178381762879392',
        appSecret: '27aad72319bf154c059f696bce055ac2',
        appAccessToken: '8eeabaf3c836d295edb26264ec76e975'
    },
    GOOGLE: {
        // https://www.google.com/recaptcha/admin
        recaptchaSecretKey: '6LecPVgUAAAAAIkVg1b-J1_og56i0GlEg-8ivM8x'
    },
    JWT: {
        EXPIRES: EXPIRES,
        SUBJECT: '9thflr.service@gmail.com',
        ISSUER: '9thflr.service@gmail.com',
        AUDIENCE: 'chatshier.com',
        SECRET: 'ilovechatshier'
    },
    CRYPTO: {
        ALGORITHM: 'sha1',
        SECRET: 'ilovechatshier'
    },
    COOKIE: {
        DOMAIN: '.fea.chatshier.com',
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
        clientId: '185667191445-g4es10vb23gm1jbt12m3c5me5vm5h8pr.apps.googleusercontent.com',
        clientSecret: 'n9FV99oB3x6b4kMzKtDa8baV',
        refreshToken: '1/J0sZ7lej6vGQgO_9ThiZ_kXTB-cx8m51AbWtEU8433M'
    }
};

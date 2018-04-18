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
    CORS: {
        origin: [
            'http://service.fea.chatshier.com:8080' // allow the website of client can access back-end service.chatshier
            // http://service.fea.chatshier.com:3002  website always allows itself
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
};

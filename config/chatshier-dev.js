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
        USERNAME: 'vagrant',
        PASSWORD: 'password'
    },
    LINE: {
        PREVIEW_IMAGE_URL: 'https://www.chatshier.com/image/chatshier_logo.png'
    },
    JWT: {
        EXPIRES: (60 * 60 * 1000),
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
        DOMAIN: '.fea.chatshier.com'
    }
};

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
        VIDEO_PREVIEW_IMAGE_URL: 'https://service.dev.chatshier.com/image/video.png',
        // LINE 的 App 會根據行動裝置存取 5 種不同的解析度圖像
        // 可能存取的像素值有240px, 300px, 460px, 700px, 1040px，例如:
        // [FILE_IMAGE_BASE_URL]/1040
        // [FILE_IMAGE_BASE_URL]/700
        // https://developers.line.me/en/reference/messaging-api/#base-url
        FILE_IMAGE_BASE_URL: 'https://service.dev.chatshier.com/image/download'
    },
    FACEBOOK: {
        // https://developers.facebook.com/apps
        APP_ID: '203545926984167', // facebook APP_ID
        APP_SECRET: '46aa7e2f586a202b412aca2722fd2e09', // facebook APP_SECRET
        CLIENT_TOKEN: 'f85d12004b7a0c170c2f45d66dd50da9', // facebook CLIENT_TOKEN
        VERSION: 'v3.0'
    },
    GOOGLE: {
        SERVER_API_KEY: 'AIzaSyDvAQBzctZSnaUeJWZlbeng7JFjV4lEmL4',
        // https://www.google.com/recaptcha/admin
        RECAPTCHA_SECRET_KEY: '6LecPVgUAAAAAIkVg1b-J1_og56i0GlEg-8ivM8x',
        // owner: 9thflr.rd@gmail.com
        // https://console.firebase.google.com/u/0/project/chatshier-d4dfd/settings/general/
        FDL_DOMAIN: 'chatshier9450.page.link'
    },
    GMAIL: {
        USER: '9thflr.dev@gmail.com', // google GMAIL
        // https://developers.google.com/oauthplayground
        // Google 所配發的 refreshToken 不會失效，會失效可能是以下原因
        // 1. 使用者解除或重新授權 app
        // 2. 使用者授權 app 時，授權的 scope 發生變更
        // 3. 使用者變更密碼
        // 此 REFRESH_TOKEN 具有存取
        // - Calendar API v3
        // - Drive API v3
        // - Firebase Dynamic Links API v1
        // - Gmail API v1
        // - Google Analytics API v3
        // - Google Play Developer API v3
        REFRESH_TOKEN: '1/Mupj6kE-5Eshzxy2UmNx1OZ_zJFXSESHUmuLpgVFE4CC0WlS87zggMqhJIvXqZa3', // google REFRESH_TOKEN
        CLIENT_ID: '1074711200692-1t055b7o6r85nut4nipc4tkibvatrmbh.apps.googleusercontent.com',
        CLIENT_SECRET: 'apmJ4E0ue7lTU6Fy_9kCy7Sd'
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
        ORIGIN: [
            'http://service.fea.chatshier.com:8081',
            'https://service.fea.chatshier.com:8444' // allow the website of client can access back-end service.chatshier
        ],
        METHODS: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
        CREDENTIALS: true
    },
    // test key for ECPAY
    // https://vendor-stage.ecpay.com.tw
    // 帳號: StageTest
    // 密碼: test1234
    ECPAY: {
        MERCHANT_ID: '2000132',
        HASHKEY: '5294y06JbISpM5x9',
        HASHIV: 'v77hoKGq4kWxNNIS'
    },
    // test key for ECPAY INVOICE
    // https://vendor-stage.ecpay.com.tw/Einvoice/Index
    // 帳號: StageTest
    // 密碼: test1234
    ECPAY_INVOICE: {
        MERCHANT_ID: '2000132',
        HASHKEY: 'ejCk326UnaZWKisg',
        HASHIV: 'q9jcZX8Ib9LM8wYk'
    },
    // test key for SPGATEWAY
    // https://cwww.spgateway.com/main/login_center/single_login
    // 帳號: chatshierTest
    // 密碼: chatshier2018
    SPGATEWAY: {
        MERCHANT_ID: 'MS14252185',
        HASHKEY: 'iPHEdSO5VGjEomtL0jzUl4VfyLxXhUuK',
        HASHIV: 'XvE76gjbleESG5Ng'
    },
    // test key for SPGATEWAY INVOICE
    // https://cinv.pay2go.com/main/Login_center/single_login
    // 統編: 53212539
    // 帳號: chatshierTest
    // 密碼: chatshier2018
    SPGATEWAY_INVOICE: {
        MERCHANT_ID: '31104030',
        HASHKEY: 'FrlNPVjLFPwYRz8cyRg67L4ZTyxunv7W',
        HASHIV: 'GTCrWZHkx3ySlEs0'
    },
    ONESIGNAL_APIKEYS: {
        // DEV_CHATSHIER_APPID
        'ce680532-b17a-4e4b-8e10-9d8b43767ad9': 'ZjM4NTRmNTMtYWVkNS00NDIxLWE1YWMtZjRlNjU2ZWEwZGEy',
        // REL_CHATSHIER_APPID
        'e7b29287-f770-4725-8834-92ed4b03f9da': 'NGJiOGY5YjYtZThhMC00Yjc4LTlkNzItNWIxMTIzOWU0N2E1',
        // CHATSHIER_APPID
        '63c3419c-4eb2-4980-a738-4e12ef1ae948': 'ZWM3NDU2ODgtYWQ4My00ZjY0LTgwMjAtYjg1MDIxMWQ1MjNl',
        // DEV_DSDSDS_APPID
        '52d47c59-3a88-4390-9fe4-b624fab30fbb': 'ODg0YjI2OTgtZTQ3MS00NjgxLTg0NWEtZmRmNTAxNzNkMjFi',
        // REL_DSDSDS_APPID
        '7cd73043-b6bb-4b40-9b08-5ba96a1f05ee': 'YTM4NThmNmMtYjRjYi00MDM5LWEyYTctZDk2YTkzYTdjMzcx',
        // DSDSDS_APPID
        'bdcb2f17-0e27-4156-976c-e03e7effaf26': 'YzExZmU2ODAtNTRjMC00MDM3LWJiN2ItYWNiOTgxYjllYWUy'
    }
};

/// <reference path='../../typings/client/index.d.ts' />

window.CHATSHIER = {
    FILE: {
        // https://developers.line.me/en/docs/messaging-api/reference/#upload-rich-menu-image
        // According to LINE official document, the max size of richmenu image should set to 1 MB
        RICHMENU_IMAGE_MAX_SIZE: 1 * 1024 * 1024,
        IMAGE_MAX_SIZE: 6 * 1024 * 1024, // 6 MB
        VIDEO_MAX_SIZE: 20 * 1024 * 1024, // 20 MB
        AUDIO_MAX_SIZE: 10 * 1024 * 1024, // 10 MB
        OTHER_MAX_SIZE: 100 * 1024 * 1024 // 100 MB
    },
    FACEBOOK: {
        APP_ID: '203545926984167', // facebook APP_ID
        COOKIE: true,
        XFBML: true,
        VERSION: 'v3.0'
    },
    GOOGLE_CALENDAR: {
        API_KEY: 'AIzaSyAggVIi65n65aIAbthGR8jmPCoEiLbujc8',
        CLIENT_ID: '1074711200692-7n7j3012dlifml8tfdvkm5rv3ko3r48m.apps.googleusercontent.com',
        DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        SCOPES: 'https://www.googleapis.com/auth/calendar'
    },
    ONESIGNAL: {
        // https://onesignal.com/
        // project owner: 9thflr.rd@gmail.com
        DEV_CHATSHIER_APPID: 'ce680532-b17a-4e4b-8e10-9d8b43767ad9',
        REL_CHATSHIER_APPID: 'e7b29287-f770-4725-8834-92ed4b03f9da',
        CHATSHIER_APPID: '63c3419c-4eb2-4980-a738-4e12ef1ae948',
        DEV_DSDSDS_APPID: '52d47c59-3a88-4390-9fe4-b624fab30fbb',
        REL_DSDSDS_APPID: '7cd73043-b6bb-4b40-9b08-5ba96a1f05ee',
        DSDSDS_APPID: 'bdcb2f17-0e27-4156-976c-e03e7effaf26'
    },
    URL: {
        /**
         * 指向 www.chatshier 專案的伺服器位址
         */
        WWW: 'https://www.dev.chatshier.com',
        /**
         * wwwUrl 伺服器的首頁路徑
         */
        INDEX: '/index',
        /**
         * 服務項目頁面路徑
         */
        TERMS: '/terms',
        /**
         * 隱私權頁面路徑
         */
        PRIVACY: '/privacy',
        /**
         * 外部服務發送 webhook 至本機的前輟網址，
         * 本機開發時可使用 ngrok 產生外部鏈結
         */
        WEBHOOK: 'https://service.dev.chatshier.com/webhook',
        /**
         * 指向 api-chatshier 專案的 API 伺服器位址
         */
        API: '..'
    }
};

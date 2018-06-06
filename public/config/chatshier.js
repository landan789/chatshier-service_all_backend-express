window.chatshier = {
    config: {
        // https://developers.line.me/en/docs/messaging-api/reference/#upload-rich-menu-image
        // According to LINE official document, the max size of richmenu image should set to 1 MB
        richmenuImageFileMaxSize: 1 * 1024 * 1024,
        imageFileMaxSize: 6 * 1024 * 1024, // 6 MB
        videoFileMaxSize: 20 * 1024 * 1024, // 20 MB
        audioFileMaxSize: 10 * 1024 * 1024, // 10 MB
        otherFileMaxSize: 100 * 1024 * 1024 // 100 MB
    },
    facebook: {
        appId: '178381762879392',
        cookie: true,
        xfbml: true,
        version: 'v3.0'
    },
    GOOGLE: {
        CALENDAR: {
            API_KEY: 'AIzaSyAggVIi65n65aIAbthGR8jmPCoEiLbujc8',
            CLIENT_ID: '1074711200692-ds4lin2uh3q4bs5doqsdipuak83j6te1.apps.googleusercontent.com',
            DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            SCOPES: 'https://www.googleapis.com/auth/calendar'
        }
    }
};

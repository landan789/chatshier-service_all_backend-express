var chatshier = window.chatshier || {};
chatshier.config = {
    imageFileMaxSize: 5 * 1000 * 1024, // 5 MB
    videoFileMaxSize: 10 * 1000 * 1024, // 10 MB
    audioFileMaxSize: 5 * 1000 * 1024, // 5 MB
    otherFileMaxSize: 50 * 1000 * 1024 // 50 MB
};

chatshier.facebook = {
    appId: '178381762879392',
    cookie: true,
    xfbml: true,
    version: 'v3.0'
};

window.chatshier = chatshier;

var chatshier = window.chatshier || {};
chatshier.config = {
    imageFileMaxSize: 5 * 1000 * 1024, // 5 MB
    videoFileMaxSize: 10 * 1000 * 1024, // 10 MB
    audioFileMaxSize: 5 * 1000 * 1024 // 5 MB
};

chatshier.facebook = {
    appId: '178381762879392',
    version: 'v3.0',
    cookie: true
};

window.chatshier = chatshier;

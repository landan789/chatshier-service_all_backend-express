declare interface Window {
    config: {
        apiKey: string,
        authDomain: string,
        databaseURL: string,
        projectId: string,
        storageBucket: string,
        messagingSenderId: string
    },
    urlConfig: {
        wwwUrl: string,
        port: string,
        index: string,
        terms: string,
        privacy: string,
        webhookUrl: string,
        apiUrl: string
    }
}
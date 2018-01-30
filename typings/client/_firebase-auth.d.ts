declare interface Window {
    auth: {
        /**
         * 監聽 firebase 的登入狀態的 Promise 。
         * 當 Promise resolved 時，代表 token 已更新並且 jquery 已經 ready 。
         */
        ready: Promise<FirebaseUser>,

        /**
         * firebase 使用者登入狀態監聽器，執行此方法後會關閉監聽事件
         */
        authStateListener: () => void,
        signOut(): () => void,
        currentUser: FirebaseUser
    }
}

abstract class FirebaseUser {
    uid: string;
    email: string;
}
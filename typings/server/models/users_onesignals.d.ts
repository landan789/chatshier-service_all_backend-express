declare module Chatshier {
    namespace Models {
        interface UsersOneSignals {
            [userId: string]: {
                oneSignals: OneSignals
            }
        }

        interface OneSignals {
            [oneSignalId: string]: OneSignal
        }

        interface OneSignal extends BaseProperty {
            oneSignalAppId: string,
            oneSignalUserId: string
        }
    }
}
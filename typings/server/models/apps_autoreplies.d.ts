declare module Chatshier {
    namespace Models {
        interface AppsAutoreplies {
            [appId: string]: {
                autoreplies: Autoreplies
            }
        }

        interface Autoreplies {
            [autoreplyId: string]: Autoreply
        }

        interface Autoreply extends BaseProperty, Reply {
            endedTime: Date | number,
            startedTime: Date | number,
            timezoneOffset: number,
            periods: AutoreplyPeriod[],
            title: string,
        }

        interface AutoreplyPeriod {
            days: number[],
            startedTime: string,
            endedTime: string
        }
    }
}
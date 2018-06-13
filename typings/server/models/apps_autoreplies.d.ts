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

        interface Autoreply {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            endedTime: Date | number,
            isDeleted: boolean,
            startedTime: Date | number,
            timezoneOffset: number,
            periods: AutoreplyPeriod[],
            text: string,
            title: string,
            type: 'text',
        }

        interface AutoreplyPeriod {
            days: number[],
            startedTime: string,
            endedTime: string
        }
    }
}
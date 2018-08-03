declare module Chatshier {
    namespace Models {
        interface AppsReceptionists {
            [appId: string]: {
                receptionists: Receptionists
            }
        }

        interface Receptionists {
            [receptionistId: string]: Receptionist
        }

        interface Receptionist extends BaseProperty {
            name: string,
            photo: string,
            email: string,
            phone: string,
            timezoneOffset: number,
            maxNumber: number,
            interval: number,
            schedules: ({
                startedTime: Date | number,
                endedTime: Date | number
            } | void)[],
            appointment_ids: string[]
        }
    }
}
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
            gcalendarId: string,
            name: string,
            photo: string,
            email: string,
            phone: string,
            timezoneOffset: number,
            maxNumber: number,
            interval: number,
            timesOfAppointment: number,
            schedules: ({
                startedTime: Date | number,
                endedTime: Date | number
            } | void)[]
        }
    }
}
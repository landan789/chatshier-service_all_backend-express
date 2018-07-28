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
            gmail: string,
            phone: string,
            timezoneOffset: number,
            maxNumber: number,
            interval: number,
            schedules: ReceptionistSchedule[]
        }

        interface ReceptionistSchedule {
            startedTime: Date | number,
            endedTime: Date | number
        }
    }
}
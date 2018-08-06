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
            isCalendarShared: boolean,
            schedules: Schedules
        }

        interface Schedules {
            [scheduleId: string]: Schedule
        }

        interface Schedule extends BaseProperty {
            summary: string,
            description: string,
            start: {
                date: Date | number,
                dateTime: Date | number
            },
            end: {
                date: Date | number,
                dateTime: Date | number
            },
            recurrence: string[]
        }
    }
}
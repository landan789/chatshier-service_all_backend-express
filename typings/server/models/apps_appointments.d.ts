declare module Chatshier {
    namespace Models {
        interface AppsAppointments {
            [appId: string]: {
                appointments: Appointments
            }
        }

        interface Appointments {
            [appointmentId: string]: Appointment
        }

        interface Appointment extends BaseProperty {
            product_id: string,
            receptionist_id: string,
            platformUid: string,
            startedTime: Date | number,
            endedTime: Date | number,
            summary: string,
            description: string,
            eventId: string,
            eventChannelId: string,
            isAccepted: boolean
        }
    }
}
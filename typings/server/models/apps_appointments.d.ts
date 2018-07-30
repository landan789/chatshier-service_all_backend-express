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
            receptionist_id: string,
            product_id: string,
            platformUid: string,
            startedTime: Date | number,
            endedTime: Date | number,
            eventId: string
        }
    }
}
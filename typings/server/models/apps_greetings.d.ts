declare module Chatshier {
    namespace Models {
        interface AppsGreetings {
            [appId: string]: {
                greetings: Greetings
            }
        }

        interface Greetings {
            [GreetingId: string]: Greeting
        }

        interface Greeting extends BaseProperty, Reply {

        }
    }
}
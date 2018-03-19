module.exports = (function() {
    let passport = require('passport');
    let JwtStrategy = require('passport-jwt').Strategy;
    let ExtractJwt = require('passport-jwt').ExtractJwt;
    let usersMdl = require('../models/users_');
    const CHATSHIER = require('../config/chatshier');

    let options = {
        jwtFromRequest: ExtractJwt.fromHeader('authorization'), // must be lower
        secretOrKey: CHATSHIER.JWT.SECRET
    };

    passport.use(new JwtStrategy(options, function(payload, next) {
        Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                let userId = payload.uid;
                // jwt is expired !
                if (payload.exp < Date.now()) {
                    reject(new Error());
                };

                usersMdl.find(userId, null, (users) => {
                    if (!users) {
                        reject(new Error());
                    };
                    if (users) {
                        resolve(users);
                    };
                });
            });
        }).then((users) => {
            next(null, users);
            return;
        }).catch(() => {
            next(null, false);
            return;
        });
    }));

    class Jwt {
        authenticate() {
            return passport.authenticate('jwt', { session: false });
        }
    };
    return new Jwt();
})();

module.exports = (function() {
    let passport = require('passport');
    let JwtStrategy = require('passport-jwt').Strategy;
    let ExtractJwt = require('passport-jwt').ExtractJwt;
    let usersMdl = require('../models/users');
    const CHATSHIER = require('../config/chatshier');
    const COOKIE = 'COOKIE';
    const HEADER = 'HEADER';

    class Jwt {
        authenticate(type) {
            let jwtFromRequest;
            if ('HEADER' === (type).toUpperCase()) {
                jwtFromRequest = ExtractJwt.fromHeader('authorization');
            };

            if ('COOKIE' === (type).toUpperCase()) {
                jwtFromRequest = (req) => {
                    let token = null;
                    if (req && req.cookies) {
                        token = req.cookies['jwt'];
                    };
                    return token;
                };
            };
            jwtFromRequest = ExtractJwt.fromHeader('authorization');

            let options = {
                jwtFromRequest: jwtFromRequest, // must be lower
                secretOrKey: CHATSHIER.JWT.SECRET
            };

            passport.use(new JwtStrategy(options, function(payload, next) {
                Promise.resolve().then(() => {
                    return new Promise((resolve, reject) => {
                        let userId = payload.uid;
                        // jwt is expired !
                        if (payload.exp < Date.now()) {
                            reject(new Error());
                            return;
                        };

                        usersMdl.find(userId, null, (users) => {
                            if (!users) {
                                reject(new Error());
                                return;
                            };
                            resolve(users);
                        });
                    });
                }).then((users) => {
                    next(null, users);
                }).catch(() => {
                    next(null, false);
                });
            }));
            return passport.authenticate('jwt', { session: false });
        }
    };
    return new Jwt();
})();

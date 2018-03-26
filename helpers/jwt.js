module.exports = (function() {
    let passport = require('passport');
    let JwtStrategy = require('passport-jwt').Strategy;
    let ExtractJwt = require('passport-jwt').ExtractJwt;
    let usersMdl = require('../models/users');
    let jsonwebtoken = require('jsonwebtoken');

    const CHATSHIER = require('../config/chatshier');

    const COOKIE = 'COOKIE';
    const HEADER = 'HEADER';

    class Jwt {
        /**
         * middleware: Authnticate the HTTP request via jwt
         * @param {String} type
         * @param {Boolean|null} refresh
         */
        authenticate(type, refresh) {
            let jwtFromRequest;
            if (HEADER === (type).toUpperCase()) {
                jwtFromRequest = ExtractJwt.fromHeader('authorization');
            };

            if (COOKIE === (type).toUpperCase()) {
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
                        // jwt has expired !
                        if (payload.exp < Date.now() && !refresh) {
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
        /**
         * sign(create) a json web token via userid
         * @param {String} userId
         */
        sign(userId) {
            let payload = {
                sub: CHATSHIER.JWT.SUBJECT,
                iss: CHATSHIER.JWT.ISSUER,
                adu: CHATSHIER.JWT.AUDIENCE,
                exp: Date.now() + CHATSHIER.JWT.EXPIRES, // jwt expires after 1 hour
                iat: Date.now(),
                uid: userId
            };

            let token = jsonwebtoken.sign(payload, CHATSHIER.JWT.SECRET);
            return token;
        }
    };
    return new Jwt();
})();

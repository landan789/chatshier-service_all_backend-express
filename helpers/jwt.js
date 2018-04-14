module.exports = (function() {
    let passport = require('passport');
    let JwtStrategy = require('passport-jwt').Strategy;
    let ExtractJwt = require('passport-jwt').ExtractJwt;
    let usersMdl = require('../models/users');
    let jsonwebtoken = require('jsonwebtoken');

    const API_ERROR = require('../config/api_error');
    const CHATSHIER = require('../config/chatshier');

    const COOKIE = 'COOKIE';
    const HEADER = 'HEADER';

    class Jwt {
        /**
         * middleware: Authnticate the HTTP request via jwt
         */
        authenticate(req, res, next) {
            let jwtFromRequest;

            jwtFromRequest = (req) => {
                let token = null;
                if (req && req.cookies) {
                    token = req.cookies['jwt'];
                };
                return token;
            };

            if (0 = req.originalUrl.indexOf('/api/') || 0 = req.hostname.indexOf('api.')) {
                jwtFromRequest = ExtractJwt.fromHeader('authorization');
            }

            let options = {
                jwtFromRequest: jwtFromRequest, // must be lower
                secretOrKey: CHATSHIER.JWT.SECRET
            };

            passport.use(new JwtStrategy(options, function(payload, next) {
                let err;
                let users;
                let info;
                Promise.resolve().then(() => {
                    return new Promise((resolve, reject) => {
                        let userId = payload.uid;
                        
                        if (payload.exp < Date.now()) {
                            reject(API_ERROR.JWT_HAD_EXPIRED);
                            return;
                        };
                        if (payload.uid !== req.params.userid) {
                            reject(API_ERROR.USER_WAS_NOT_PERMITTED);
                            return;
                        }
                        usersMdl.find(userId, null, (users) => {
                            if (!users) {
                                reject(API_ERROR.USER_FAILED_TO_FIND);
                                return;
                            };
                            resolve(users);
                        });
                    });
                }).then((_users) => {
                    err = null;
                    users = _users;
                    next(err, users, info);
                }).catch((ERROR) => {
                    err = null;
                    users = false;
                    info = ERROR;
                    next(err, users, info);
                });
            }));

            passport.authenticate('jwt', { session: false }, (err, users, info) => {
                // the arguments of err, user, info are same as next(err, user, info)
                // this function is called after passport fails to verify string of jwt or after next() in passport.use called
                let ERROR = info;
                if (err || !users) {
                    var json = {
                        status: 0,
                        msg: ERROR.MSG || API_ERROR.USER_WAS_NOT_AUTHORIZED.MSG,
                        code: ERROR.CODE || API_ERROR.USER_WAS_NOT_AUTHORIZED.CODE
                    };
                    res.status(401).json(json);
                    return;
                }
                // the request of this userid and jwt is also authorized, permmited and does not expire
                if (!err && users) {
                    next();
                    return;
                }
            })(req, res, next);
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

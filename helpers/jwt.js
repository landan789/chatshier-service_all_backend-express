module.exports = (function() {
    let passport = require('passport');
    let JwtStrategy = require('passport-jwt').Strategy;
    let ExtractJwt = require('passport-jwt').ExtractJwt;
    let usersMdl = require('../models/users');
    let jsonwebtoken = require('jsonwebtoken');

    /** @type {any} */
    const ERROR = require('../config/error.json');
    const CHATSHIER = require('../config/chatshier');

    const COOKIE = 'COOKIE';
    const HEADER = 'HEADER';

    class JwtHelper {
        constructor() {
            this.authenticate = this.authenticate.bind(this);
        }

        getJwtFromRequest(req) {
            if (0 === req.originalUrl.indexOf('/api/') ||
                0 === req.hostname.indexOf('api.')) {
                return ExtractJwt.fromHeader('authorization');
            }

            let jwtFromRequest = (req) => {
                let token = null;
                if (req && req.cookies) {
                    token = req.cookies.jwt;
                }
                return token;
            };
            return jwtFromRequest;
        }

        /**
         * middleware: Authnticate the HTTP request via jwt
         */
        authenticate(req, res, next) {
            let jwtFromRequest = this.getJwtFromRequest(req);
            let options = {
                jwtFromRequest: jwtFromRequest, // must be lower
                secretOrKey: CHATSHIER.JWT.SECRET
            };

            passport.use(new JwtStrategy(options, (payload, next) => {
                let err;
                let users;
                let info;

                return Promise.resolve().then(() => {
                    let userId = payload.uid;

                    if (payload.exp < Date.now()) {
                        return Promise.reject(ERROR.JWT_HAD_EXPIRED);
                    }

                    if (payload.uid !== req.params.userid) {
                        return Promise.reject(ERROR.JWT_WAS_NOT_PERMITTED);
                    }

                    return usersMdl.find(userId).then((users) => {
                        if (!(users && users[userId])) {
                            return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                        }
                        return Promise.resolve(users);
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
                    let json = {
                        status: 0,
                        msg: ERROR.MSG || ERROR.JWT_WAS_NOT_AUTHORIZED.MSG,
                        code: ERROR.CODE || ERROR.JWT_WAS_NOT_AUTHORIZED.CODE
                    };
                    res.status(401).json(json);
                    return;
                }
                // the request of this userid and jwt is also authorized, permmited and does not expire
                if (!err && users) {
                    next();
                }
            })(req, res, next);
        }

        /**
         * sign(create) a json web token via userid
         * @param {string} userId
         * @param {number} [expires]
         */
        sign(userId, expires) {
            expires = expires || CHATSHIER.JWT.EXPIRES; // jwt expires after 1 hour (default)

            let payload = {
                sub: CHATSHIER.JWT.SUBJECT,
                iss: CHATSHIER.JWT.ISSUER,
                adu: CHATSHIER.JWT.AUDIENCE,
                exp: Date.now() + expires,
                iat: Date.now(),
                uid: userId
            };

            let token = jsonwebtoken.sign(payload, CHATSHIER.JWT.SECRET);
            return token;
        }
    }

    return new JwtHelper();
})();

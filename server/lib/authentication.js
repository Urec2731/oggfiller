var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var User = require('./../models/usersmodel.js');
var config = require('./../configs/config01.json');

module.exports = passport.use(new FacebookStrategy({
        clientID: config.facebook.clientID,
        clientSecret: config.facebook.clientSecret,
        callbackURL: config.facebook.callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
        User.findOne({ oauthID: profile.id }, function(err, user) {
            if(err) { console.log(err); }
            if (!err && user != null) {
                done(null, user);
            } else {
                var user = new User({
                    oauthID: profile.id,
                    name: profile.displayName,
                    created: Date.now()
                    // todo userHashe
                });
                user.save(function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                       // console.log("saving user ...");
                        done(null, user);
                    };
                });
            };
        });
    }
));

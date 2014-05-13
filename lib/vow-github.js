/* jshint node: true */
var asker = require('vow-asker'),
    extend = require('extend');


var options = {
    protocol: 'https:',
    headers: {
        Accept: 'application/json'
    },
    allowGzip: true,
    timeout: 5000
};

var VowGithub = {
    getUser: function(token) {
        return asker(extend(true, {}, options, {
            host: 'api.github.com',
            path: '/user',
            query: {
                /* jshint camelcase: false */
                access_token: token
            },
            headers: {
                'User-Agent': 'Awesome diff getter'
            },
            method: 'GET'
        }));
    },
    getAccessToken: function (clientId, secret, sessionCode) {
        return asker(extend(true, {}, options, {
            host: 'github.com',
            path: '/login/oauth/access_token',
            query: {
                /* jshint camelcase: false */
                client_id: clientId,
                client_secret: secret,
                code: sessionCode
            },
            method: 'POST'
        }));
    }
};

module.exports = VowGithub;

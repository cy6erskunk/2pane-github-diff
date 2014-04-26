/* jshint node: true */
var debug = require('./debug');
/**
 * @typedef options
 * @property  {string} username
 * @property {string} repo
 * @property  {string} filename
 * @property {string} [token]
 */
var diffGetter = function(options) {

    var asker = require('vow-asker'),
        parser = require('./patch-parser'),
        headers = {
            'User-Agent': 'Awesome diff getter'
        },
        statusFilter = function (code) {
            return {
                accept : [200, 201, 302, 304, 403].indexOf(code) !== -1,
                isRetryAllowed : 400 > code || code > 499
            };
        },
        ask = function (url) {
            debug(url);
            return asker({
                url: url,
                headers: headers,
                statusFilter: statusFilter,
                allowGzip: true,
                timeout: 5000
            }).fail(function (error) {
                error.log();
            });
        },
        askJSON = function (url) {
            return ask(url)
                .then(function(response) { return JSON.parse(response.data); });
        },
        fileName = options.filename,
        url = [
                'https://api.github.com/repos',
                options.username,
                options.repo,
                'commits',
                options.commitish || 'master'
            ].join('/'),
        fileBefore,
        fileAfter,
        patch;

        if (options.token) {
            headers.Authorization = 'token ' + options.token;
        }

    return askJSON(url)
        .then(function (data) {
            var rawUrl;
            if (data.parents.length !== 1) {
                throw new Error('We need only single parent!');
            }
            debug('> got commit info');
            data.files.some(function(file) {
                if (file.filename === fileName) {
                    patch = file.patch;
                    /* jshint camelcase: false */
                    rawUrl = file.raw_url;
                    return true;
                }
            });
            if ( ! rawUrl) {
                throw new Error('could not find rawUrl for file: ' + fileName);
            }

            return ask(rawUrl);
        })
        .then(function (response) {
            return ask(response.headers.location)
                .then(function (fileResponse) {
                    fileAfter = String(fileResponse.data);
                    debug('>> got first file contents');
                    return response;
                });
        })
        .then(function (response) {
            var loc = response.headers.location.replace(new RegExp('\/([a-z0-9]+)\/(?=' + fileName + ')'), '/$1~1/');
            return ask(loc)
                .then(function (fileResponse) {
                    fileBefore = String(fileResponse.data);
                    debug('>> got second file contents');
                    return response;
                });
        })
        .then(function () {

            return {
                patch: JSON.stringify(parser(patch).patch),
                fileBefore: fileBefore.split('\n').join('\\n'),
                fileAfter: fileAfter.split('\n').join('\\n')
            };
        });
};

module.exports = diffGetter;

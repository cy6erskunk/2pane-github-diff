var express = require('express'),
    cookieParser = require('cookie-parser'),
    debug = require('./lib/debug'),
    config = require('./config'),
    jsesc = require('jsesc'),
    VowGithub = require('./lib/vow-github'),
    Vow = require('vow'),
    app = express(),
    diffGetter  = require('./lib/diff-getter'),
    fs = require('fs'),
    equal = require('deep-equal'),
    ignoreCache = Boolean(process.env.IGNORE_CACHE),
    cacheConf = 'cache.json',
    options = {},
    GH_CLIENT_ID = process.env.GH_CLIENT_ID || null,
    GH_SECRET = process.env.GH_SECRET || null;

app.use(express.static(__dirname + '/dist'));
app.use(cookieParser());

app.get('/', function (req, res, next) {
    options = {
        user: req.query.user || '',
        repo: req.query.repo || '',
        file: req.query.filename || '',
        commit: req.query.commit || '',
        empty: false,
        clientId: GH_SECRET && GH_CLIENT_ID || false
    };

    return Vow.invoke(function () {
        if (req.cookies.gh_access_token) {

            return VowGithub.getUser(req.cookies.gh_access_token)
            .then(function(response) {
                var data = JSON.parse(response.data);
                if (data.error) {
                    return next(data.error);
                } else {
                    if ( ! req.cookies.gh_login || req.cookies.gh_login == data.login) {
                        res.cookie('gh_login', data.login);
                        options.gh_login = data.login;
                    } else if (req.cookies.gh_login != data.login) {
                        res.clearCookie('gh_access_token');
                        res.clearCookie('gh_login');
                    }
                }
            }, function(error) {
                if (error.data.statusCode == 401) {
                    res.clearCookie('gh_access_token');
                    res.clearCookie('gh_login');
                } else {
                    return next(error);
                }
            });
        }
    })
    .always(function() {
        if (! ignoreCache && fs.existsSync(cacheConf) && equal(options, JSON.parse(fs.readFileSync(cacheConf)))) {
            debug('loading from cache, options: ', options);
            return next();
        }

        if (options.user && options.repo && options.file) {
            fs.writeFileSync('dist/diff_test.js', 'var diff_model = [], content_before = content_after = \'\';');

            diffGetter(options)
                .then(function (response) {
                    var patch = 'diff_model = ' + response.patch + ';\n\n',
                        fileBefore = 'content_before = "' + jsesc(response.fileBefore, { quotes: 'double'}) + '";\n\n',
                        fileAfter = 'content_after = "' + jsesc(response.fileAfter, { quotes: 'double'}) + '";\n\n';

                    fs.writeFileSync('dist/diff_test.js', patch + fileBefore + fileAfter);
                    fs.writeFileSync(cacheConf, JSON.stringify(options));
                }).fail(function (error) {
                    return next(error);
                });
        } else {
            options.empty = true;
        }
        return next(error);
    });
}, function (req, res) {
    res.render('diff.jade', options);
});

app.get('/callback', function (req, res, next) {
    var sessionCode = req.query.code;

    VowGithub.getAccessToken(GH_CLIENT_ID, GH_SECRET, sessionCode)
    .then(function(response) {
        var data = JSON.parse(response.data);
        if (data.error) {
            res.send(400, data.error);
        } else {
            res.cookie('gh_access_token', data.access_token);
            res.redirect('/');
            res.send('ok');
        }
    }, function(error) {
        return next(error);
    });
});

app.use(function (err, req, res, next) {
    console.log(err.stack);
    res.send(500, 'WHOOPS...');
});

console.log('starting on port ' + (Number(process.env.PORT) || config.port));
app.listen(Number(process.env.PORT) || config.port);

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
app.set('view engine', 'pug');

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
        fs.writeFileSync('dist/diff_test.js', 'var diff_model = [], content_before = content_after = \'\';');

        if (! ignoreCache && fs.existsSync(cacheConf) && equal(options, JSON.parse(fs.readFileSync(cacheConf)))) {
            debug('loading from cache, options: ', options);
            return next();
        }
        if (options.user && options.repo && options.file) {
            diffGetter(options)
                .then(function (response) {
                    var patch,
                        fileBefore,
                        fileAfter;

                    patch = 'diff_model = ' + response.patch + ';\n\n',
                    fileBefore = 'content_before = "' + jsesc(response.fileBefore, { quotes: 'double'}) + '";\n\n',
                    fileAfter = 'content_after = "' + jsesc(response.fileAfter, { quotes: 'double'}) + '";\n\n';

                    fs.writeFileSync('dist/diff_test.js', patch + fileBefore + fileAfter);
                    fs.writeFileSync(cacheConf, JSON.stringify(options));
                    return next();
                }).fail(function (error) {
                    return next(error);
                });
        } else {
            options.empty = true;
            return next();
        }
    });
}, function (req, res) {
    res.render('diff.pug', options);
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
    if (err.data && err.data.statusCode && err.data.statusCode === 404) {
        res.send(404, 'kinda 404 :( <br/><a href="/">Go Home and try again</a>');
    } else {
        console.log(err.stack);
        res.send(500, 'WHOOPS...');
    }
});

console.log('starting on port ' + (Number(process.env.PORT) || config.port));
app.listen(Number(process.env.PORT) || config.port);

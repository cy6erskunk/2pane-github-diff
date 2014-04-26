var express = require('express'),
    debug = require('./lib/debug'),
    config = require('./config'),
    jsesc = require('jsesc'),
    app = express(),
    diffGetter  = require('./lib/diff-getter'),
    fs = require('fs'),
    equal = require('deep-equal'),
    renderDiff = function (req, res) {
        return res.render('diff.jade', {});
    },
    ignoreCache = Boolean(process.env.IGNORE_CACHE);

app.use(express.static(__dirname + '/dist'));

app.get('/', function (req, res) {
    res.render('index.jade', {});
});

app.get('/retrieve', function (req, res, next) {
    var cacheConf = 'cache.json',
        options = {
            username: req.query.user,
            repo: req.query.repo,
            filename: req.query.filename,
            commitish: req.query.commit || null
        };

    if (! ignoreCache && fs.existsSync(cacheConf) && equal(options, JSON.parse(fs.readFileSync(cacheConf)))) {
        debug('loading from cache, options: ', options);
        return next();
    }

    diffGetter(options).then(function (response) {
        var patch = 'var diff_model = ' + response.patch + ';\n\n',
            fileBefore = 'var content_before = "' + jsesc(response.fileBefore, { quotes: 'double'}) + '";\n\n',
            fileAfter = 'var content_after = "' + jsesc(response.fileAfter, { quotes: 'double'}) + '";\n\n';

        fs.writeFileSync('dist/diff_test.js', patch + fileBefore + fileAfter);
        fs.writeFileSync(cacheConf, JSON.stringify(options));
        next();
    }).fail(function (error) {
        return next(error);
    });
}, function (req, res, next) {
    renderDiff(req, res);
});

app.get('/diff', renderDiff);

app.use(function (err, req, res, next) {
    console.log(err.stack);
    res.send(500, 'WHOOPS...');
});

console.log('startting on port ' + Number(process.env.PORT) || config.port);
app.listen(Number(process.env.PORT) || config.port);

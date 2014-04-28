var express = require('express'),
    debug = require('./lib/debug'),
    config = require('./config'),
    jsesc = require('jsesc'),
    app = express(),
    diffGetter  = require('./lib/diff-getter'),
    fs = require('fs'),
    equal = require('deep-equal'),
    ignoreCache = Boolean(process.env.IGNORE_CACHE),
    cacheConf = 'cache.json',
    options = {};

app.use(express.static(__dirname + '/dist'));

app.get('/', function (req, res, next) {
    options = {
        user: req.query.user || '',
        repo: req.query.repo || '',
        file: req.query.filename || '',
        commit: req.query.commit || '',
        empty: false
    };

    if (! ignoreCache && fs.existsSync(cacheConf) && equal(options, JSON.parse(fs.readFileSync(cacheConf)))) {
        debug('loading from cache, options: ', options);
        return next();
    }

    if (options.user && options.repo && options.file) {
        diffGetter(options).then(function (response) {
            var patch = 'var diff_model = ' + response.patch + ';\n\n',
                fileBefore = 'var content_before = "' + jsesc(response.fileBefore, { quotes: 'double'}) + '";\n\n',
                fileAfter = 'var content_after = "' + jsesc(response.fileAfter, { quotes: 'double'}) + '";\n\n';

            fs.writeFileSync('dist/diff_test.js', patch + fileBefore + fileAfter);
            fs.writeFileSync(cacheConf, JSON.stringify(options));
        }).fail(function (error) {
            return next(error);
        });
    } else {
        options.empty = true;
    }
    return next();
}, function (req, res) {
    res.render('diff.jade', options);
});

app.use(function (err, req, res, next) {
    console.log(err.stack);
    res.send(500, 'WHOOPS...');
});

console.log('starting on port ' + (Number(process.env.PORT) || config.port));
app.listen(Number(process.env.PORT) || config.port);

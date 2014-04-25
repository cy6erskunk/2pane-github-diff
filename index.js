var express = require('express'),
    config = require('./config'),
    app = express(),
    diffGetter  = require('./lib/diff-getter'),
    fs = require('fs'),
    equal = require('deep-equal'),
    renderDiff = function (req, res) {
        return res.render('diff.jade', {});
    };

app.use(express.static(__dirname + '/dist'));

app.get('/', function (req, res) {
    res.render('index.jade', {});
});

app.get('/retrieve', function (req, res, next) {
    var metaFile = 'meta.json',
        options = {
            username: req.query.user,
            repo: req.query.repo,
            filename: req.query.filename,
            commitish: req.query.commit || null
        };

    if (fs.existsSync(metaFile) && equal(options, JSON.parse(fs.readFileSync(metaFile)))) {
        return next();
    }

    diffGetter(options).then(function (response) {
        var patch = 'var diff_model = ' + response.patch + ';\n\n',
            fileBefore = 'var content_before = "' + response.fileBefore.replace(/"/g, '\\"') + '";\n\n',
            fileAfter = 'var content_after = "' + response.fileAfter.replace(/"/g, '\\"') + '";\n\n';

        fs.writeFileSync('dist/diff_test.js', patch + fileBefore + fileAfter);
        fs.writeFileSync(metaFile, JSON.stringify(options));
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

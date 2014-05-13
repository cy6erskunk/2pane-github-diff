/* jshint node: true */
module.exports = function (grunt) {
    var config = require('./config');

    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                src: [
                    'src/js/intro.js',
                    'src/js/DOM.js',
                    'src/js/DiffData.js',
                    'src/js/DiffView.js',
                    'src/js/diff.js',
                    'src/js/outro.js'
                ],
                dest: 'src/built.js'
            },
            dev: {
                src: '<%= concat.dist.src %>',
                dest: '<%= uglify.dist.dest %>'
            }
        },
        uglify: {
            options: {
                sourceMap: true,
            },
            dist: {
                src: '<%= concat.dist.dest %>',
                dest: 'dist/js/diff.min.js'
            }
        },
        sass: {
            dist: {
                src: 'src/styles/diff.scss',
                dest: 'dist/css/diff.css'
            }
        },
        jshint: {
            options: {
                force: true,
                jshintrc: true,
            },
            all: {
                src: ['src/js/*.js', 'lib/*.js', 'Gruntfile.js' ],
            }
        },
        watch: {
            options: {
                livereload: true
            },
            jshint : {
                files: [ '<%= jshint.all.src %>'],
                tasks: 'jshint'
            },
            concat: {
                files: '<%= concat.dist.src %>',
                tasks: 'concat'
            },
            sass: {
                files: '<%= sass.dist.src %>',
                tasks: 'sass'
            }
        },
        nodemon: {
            dev: {
                script: 'index.js',
                options: {
                    ignore: ['node_modules/**', 'dist/**']
                }
            },
        },
        open: {
            dev: {
                path: 'http://localhost:' + config.port + '/'
            }
        },
        concurrent: {
            dev: [ 'nodemon:dev', 'open', 'watch&build'],
            options: {
                logConcurrentOutput: true
            }
        }
    });

    grunt.registerTask('build', [ 'concat:dist', 'uglify', 'sass']);
    grunt.registerTask('build-dev', [ 'concat:dev', 'sass']);
    grunt.registerTask('watch&build', [ 'build-dev', 'jshint', 'watch']);
    grunt.registerTask('server', [ 'concurrent:dev' ]);

};

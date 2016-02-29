'use strict';

module.exports = function(grunt) {

    // https://github.com/sindresorhus/load-grunt-tasks
    require('load-grunt-tasks')(grunt);

    // http://gruntjs.com/configuring-tasks#grunt-configuration
    grunt.initConfig({


        //directory to place finished project, usually /dist folder, but
        // for github going to previous folder to use gh-pages 
        dist: '..', 

        /* https://www.npmjs.com/package/grunt-contrib-jshint */
        /* http://jshint.com/docs/options/ */
        jshint: {
            gruntfile: {
                options: {
                    jshintrc: '.jshintrc-grunt',
                },
                    src: 'Gruntfile.js',
            },
            src: {
                options: {
                    jshintrc: '.jshintrc',
                },
                    src: 'app/js/app.js'
            }
        },

        // https://www.npmjs.com/package/grunt-contrib-clean
        clean: {
            tmp: {
                src: ['.tmp/']
            }
        },

        // https://www.npmjs.com/package/grunt-contrib-concat
        concat: { 
            generated: { 
                files: [{
                    src:['app/css/from-bootstrap.css', 'app/bower_components/toastr/toastr.css','app/css/magnific-popup.css','app/css/main.css'],
                    dest: '.tmp/css/app.css'
                },

                {
                    src: ['app/bower_components/jquery/dist/jquery.min.js',
                          'app/bower_components/knockout/dist/knockout.js',
                          'app/bower_components/firebase/firebase.js',
                          'app/bower_components/toastr/toastr.js',
                          'app/js/magnific-popup.js',
                          'app/js/jquery.autocomplete.min.js',
                          'app/js/app.js'
                          ],
                    dest: '.tmp/js/all.js'
                }]
            } 
        },

        // https://www.npmjs.com/package/grunt-contrib-uglify
        uglify: {
            options: {
                preserveComments: false, 
                mangle: false
            },
            generated: { 
                files:[{
                    src: [ '.tmp/js/all.js' ],
                    dest: '<%= dist %>/js/all.min.js'
                }]
            } 
        },

        // https://www.npmjs.com/package/grunt-contrib-cssmin
        cssmin: {
            generated: {
                files:[{
                        src: [ '.tmp/css/app.css' ],
                        dest: '<%= dist %>/css/app.css'
                    }
                ]
            }
        },

        // https://www.npmjs.com/package/grunt-processhtml
        processhtml: {
            dist: {
              files: [{
                    expand: true,                              
                    cwd: 'app/',
                    src: ['**/*.html'],
                    dest: '.tmp/'
                }]
            }
        },

        // https://www.npmjs.com/package/grunt-contrib-copy
        // assuming php backend: adding .htaccess file
        copy: {
            app: {
                files: [{
                    expand: true,
                    cwd:'app/',
                    src: ['.htaccess', 'fonts/**'],
                    dest: '<%= dist %>/'
                }]
            }
        },

        /* https://www.npmjs.com/package/grunt-contrib-imagemin */
        imagemin: {
            options: {
                optimizationLevel: 5
            },
            target: {
                files: [{
                    expand: true,
                    cwd: 'app/',
                    src: ['**/*.{jpg,png}'],
                    dest: '<%= dist %>/'
                }]
            }
        },

        // https://www.npmjs.com/package/grunt-contrib-htmlmin
        htmlmin: {                                     // Task 
            dist: {                                      // Target 
                options: {                                 // Target options 
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: [{
                    expand: true,                                   // Dictionary of files 
                    cwd: '.tmp/',
                    src: ['**/*.html'],
                    dest: '<%= dist %>/'
                }]
            }
        },

        // https://www.npmjs.com/package/grunt-contrib-watch
        watch: {
            livereload: {
                files: ['app/**/*.html',
                        'app/js/*.js',
                        'app/css/*.css',
                        'app/img/**/*.{jpg,gif,svg,jpeg,png}',
                        '!node_modules/**',
                        '!<%= dist %>/'
                ],
                options: {
                    livereload: true
                }
            },
            jshint: {
                files: ['app/js/app.js', 'Gruntfile.js', '.jshintrc', 'jshintrc-grunt'],
                tasks: ['jshint']
            }
        },

        // https://www.npmjs.com/package/grunt-contrib-connect
        connect: {
            app: {
                options: {
                    port: 9000,
                    base: 'app',
                    open: true,
                    livereload: true,
                    // hostname: '127.0.0.1'
                    hostname: 'localhost'
                }
            },

            dist: {
                options: {
                    port: 9000,
                    base: '<%= dist %>',
                    open: true,
                    keepalive: true,
                    livereload: false,
                    hostname: '127.0.0.1'
                }
            }
        }

    });

// Tasks to run

    // default task   > grunt
    grunt.registerTask('default', [ 'connect:app', 'watch' ]);
    

    // test concat, uglify, cssmin
    grunt.registerTask('min', [ 'clean', 'concat', 'cssmin', 'uglify']);

    //publish finished site to /dist directory  > grunt publish
    grunt.registerTask('publish', ['jshint', 'clean:tmp', 'imagemin', 'concat', 'cssmin', 'uglify', 'processhtml', 'copy', 'htmlmin:dist', 'clean:tmp', 'connect:dist']);
};
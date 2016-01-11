'use strict';

module.exports = function(grunt) {

    // https://github.com/sindresorhus/load-grunt-tasks
    require('load-grunt-tasks')(grunt);

    // http://gruntjs.com/configuring-tasks#grunt-configuration
    grunt.initConfig({


        //directory to place finished project, usually /dist folder, but
        // for github going to previous folder to use gh-pages 
        dist: '..', 

        // https://www.npmjs.com/package/grunt-responsive-images
        responsive_images: {
            dev: {
                options: {
                /* by default uses GraphicMagick, but if you want to use ImageMagick uncomment line below */
                // engine: 'im',
                    quality: 70,
                    createNoScaledImage: true,
                    upscale: false,
                    sizes: [{
                        // name: 'small',
                        width:360
                    },{
                        // name: 'medium',
                        width: 720
                    },{
                        // name: 'large',
                        width: 1440
                    }]
                },

                files: [{
                    expand: true,
                    src: ['*.{gif,jpg,png}'],
                    // placed it outside app since these will be processed and are not part of your app/website
                    cwd: 'images_src/',
                    dest: 'app/img'
                }]
            }
        },

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
                    src: 'app/views/js/main.js'
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
                    src:['app/css/main.css', 'app/css/styles.css'],
                    dest: '.tmp/css/app.css'
                },

                {
                    src: ['app/js/knockout-3.4.0.js', 'app/js/app.js'],
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
                    },
                    {
                        src: [ 'app/css/print.css' ],
                        dest: '<%= dist %>/css/print.css'
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
                    src: ['.htaccess'],
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
            responsive_images: {
                files: ['images_src/*.{gif,jpg,png}'],
                tasks: ['responsive-img']
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
    
    // create different sized images    > grunt responsive-img, dont really need since can just do: 'grunt responsive_images'
    grunt.registerTask('responsive-img', ['responsive_images']);

    // test concat, uglify, cssmin
    grunt.registerTask('min', [ 'clean', 'concat', 'cssmin', 'uglify']);

    //publish finished site to /dist directory  > grunt publish
    grunt.registerTask('publish', ['jshint', 'clean:tmp', 'imagemin', 'concat', 'cssmin', 'uglify', 'processhtml', 'copy', 'htmlmin:dist', 'clean:tmp', 'connect:dist']);
};
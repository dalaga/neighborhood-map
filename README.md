# Website Performance Optimization portfolio project

The object of this project was to optimized the critical rendering path for ```index.html``` and improve the frame rate to 60 fps or higher for ```views/pizza.html`` applying the techniques picked up in the [Critical Rendering Path course](https://www.udacity.com/course/ud884) and [Building 60 FPS Web Apps](https://www.udacity.com/course/browser-rendering-optimization--ud860) courses.

In addition, [Grunt](http://gruntjs.com/) was used to automatically perform some optimization, such as image optimization, and concanication/minification of CSS and JS files where needed.



## Part 1: Optimize PageSpeed Insights score for index.html

Improvements:

1. Inline critical CSS styles.
2. Added ```media="print"``` attribute to print style file so it doesn't render block.
3. Optimized images.
4. Added responsive image files and markup (3 sizes).
5. Aysnc google fonts.
5. Async non-critical javascript and moved to bottom of page.
6. minified js,css, and html.
	* mobile score on github page:
	* ![](http://i.imgur.com/JrVlmWR.png)

 	* desktop score on github page:
		* ![](http://i.imgur.com/wsZfGUQ.png)

7. For apache server added .htaccess files per recommendation settings from [Apache Server Configs](https://github.com/h5bp/server-configs-apache). If not using apache can try generating one for other platforms [h5bp - geneartor-server-config](https://github.com/h5bp/generator-server-configs).

	* mobile score on apache server:
		* ![](http://i.imgur.com/9YSuCji.png)

	* desktop score on apache server:
		* ![](http://i.imgur.com/0GSTomo.png)

## Part 2: Optimize Frames per Second in pizza.html

Improvements:

1. 'use strict' at function level on any functions that were modified or added for better compatability.
2. cached DOM elements outside loops where possible.
3. changed querySelectAll to the faster getElementByID or getElementByClassName.
4. on sizeSwitcher() return class with width settings on css file so we don't have to iterate through all img elements to set width.
5. removed the determineDx() and changePizzaSizes() functions which were very inificient by querying the DOM often.
6. on updatePosition():
	* use the cached value for scrollTop position
	* instead of looping through DOM elements used cached pizzaList array that was created when pizzas were initialized.
	* since we only have 5 phases, create cached array and use in loop as we dermine the phase for each pizza in loop.
7. placed pizza elements on own composition layer by using ```will-change``` and ```trnaslateZ(0)``` hack.
8. used transform insted of left when moving pizzas so we only trigger composite.
9. instead of generating 200 moving pizza element only genereate enough for current viewport.
10. used a throttle function that uses requestAnimationFrame to optimize scrolling event.
11. updated initPizza() to give each generated elem an initial  'left' position value and also moved var decleration outside loop for performance benefit.

## Part 3: Grunt workflow

For the purpose of uploading project to github all project related files are located in the ```_src``` folder and the final project files are output to the root directory so they can be viewed online as github page. The actual project files are placed in the ```_src/app``` directory.

### Getting Ready

1. Clone repo.
2. Verify you have Node and Grunt installed.
3. cd into ```_src``` directory.
4. to installed all required Grunt plugins for project we don't have to manually install each since we have a package.json file.  Run ```npm install``` to install plugins.
5. You are now ready to use Grunt.

### Using Grunt

1. ```_src/Grunfile.js``` contains configuration for all tasks used in this project.
2. The default task for grunt is to start a web server and watch for file changes to automatically refresh browser on file changes, lint js files on js file changes, and process responsive images. 
3. To generate different size images for responsive images:
	* place original image in ```_src/images_src``` directory
	* from _src folder run ```grunt responsive_images```.  According to config 3 images will be generated and placed in the app/img folder.
4. To manually lint your js run ```grunt jshint:src```. There are two seperate options files used for linting, one for your javascript and the other for the Grunfile.js
5. to publish project run ```grunt publish```.  This task will output optimized files for project and start server with optimized project files to review.



### To View Project

* [Github](http://javsalazar.github.io/frontend-nanodegree-mobile-portfolio/)
* [Other](http://p4.xjav.com)

























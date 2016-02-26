# Neighborhood Map

The object of this project was to develop a single-page application featuring a map of a neighborhood. This map shows the locations of a handful of micro breweries throughout San Diego County.  The Google maps geocoder API was used to reverse lookup address to get geographic coordinates and the FourSquare API was used to get additional information such as rating, likes, and images for each of the breweries.  In order to keep data persistent and real-time a Firebase database was used to store data.


In addition, [Grunt](http://gruntjs.com/) was used to automatically perform some optimization, such as concanication/minification of CSS and JS files where needed.


## How To Use

* A list of current breweries are on the left side.  List can slide out of view if need to view content on map that may be hidden.

* A search field at top can be used to filter breweries by name, area, or any part of the address.

* Can view a picture gallery of brewery if picture in infoWindow is clicked.

* A brewery can be editted or removed by selecting from list ( or marker on map) and clicking appropiate icon to edit or remove.

* A new brewery can be added by clicking on the "+ brewery" button.  Note that the name and address are required fields.

* NOTE: if all breweries are removed from list, by default the next time page is loaded the brewery list will be populated with the predefined list.


## APIs used

* Google Maps API
* Google Mapd Geocoder API
* FourSquare API



## Grunt workflow

For the purpose of uploading project to github all project related files are located in the ```_src``` folder and the final project files are output to the root directory so they can be viewed online as github page. The actual project files are placed in the ```_src/app``` directory.

### Getting Ready

1. Clone repo.
2. Verify you have Node and Grunt installed.
3. cd into ```_src``` directory.
4. to installed all required Grunt plugins for project we don't have to manually install each since we have a package.json file.  Run ```npm install``` to install plugins.
5. You are now ready to use Grunt.

### Using Grunt

1. ```_src/Grunfile.js``` contains configuration for all tasks used in this project.
2. The default task for grunt is to start a web server and watch for file changes to automatically refresh browser on file changes, and lint js files on js file changes. 
3. To generate different size images for responsive images:
	* place original image in ```_src/images_src``` directory
	* from _src folder run ```grunt responsive_images```.  According to config 3 images will be generated and placed in the app/img folder.
4. To manually lint your js run ```grunt jshint:src```. There are two seperate options files used for linting, one for your javascript and the other for the Grunfile.js
5. to publish project run ```grunt publish```.  This task will output optimized files for project and start server with optimized project files to review.



### To View Project

* [Github](http://javsalazar.github.io/neighborhood-map/)


























angular-promise-cache
=====================

AngularJS service that provides a generic way to cache promises and ensure all cached promises are resolved correctly.

Huh?
------
Without this awesome library:

**model.js**

    angular.module('myAwesomeApp')
      .factory('myAwesomeModel', function($q, $http) {
        var cache = null;
        return {
          clearData: function() {
            cache = null;
          },
          getData: function() {
            var deferred = $q.defer();
            
            if (cache === null) {
              $http.get('/my/data').then(function(response) {
                cache = response;
                deferred.resolve(cache);
              });
            }
            else {
              deferred.resolve(cache);
            }
            
            return deferred.promise;
          }
        };
      }

And guess what? This has to be repeated for every single common use case! And when should we clear the data? Ideally, we set a TTL and allow it gracefully expire, but that requires more repeated code...

I know I know - it'd be **awesome** if someone provided a simple, easy to use library that solved these issues...it'd be even more awesome if you happened to have the github for that library open in your browser...Okay enough. Just install and enjoy!


Installation
---------
    bower install angular-promise-cache --save

Usage
---------
**app.js:**  

    angular.module('myAwesomeApp', ['angular-promise-cache'])
***
**model.js**  

    angular.module('myAwesomeApp')
      .factory('myAwesomeModel', function($http, promiseCache) {
        return {
          getData: function() {
            return promiseCache(function() {
                return $http.get('/my/data');
            });
          }
        };
      }
***
**controller.js**  

    angular.module('myAwesomeApp')
      .controller('myAwesomeCtrl', function($scope, myAwesomeModel) {
        myAwesomeModel.getData(); // xhr request!
        myAwesomeModel.getData(); // no xhr request!!
        
        // assume data loads finally
        
        myAwesomeModel.getData(); // no xhr request!
        
        // expires based on TTL (since we did not provide one, it uses the default of 5 seconds)
      });
***
**Voila!**

Testing
---------
Requires:
* Karma
* PhantomJS

To run:

    karma start
    karma run
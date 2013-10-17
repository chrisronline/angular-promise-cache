angular-promise-cache
=====================

AngularJS service that provides a generic way to cache promises and ensure all cached promises are resolved correctly.

Huh?
------
Our goal is to allow this kind of code...

    angular.module('myAwesomeApp')
      .controller('myAwesomeCtrl', function($scope, myAwesomeModel, uhOhAnotherService) {
        myAwesomeModel.getData(); // xhr request!
        myAwesomeModel.getData(); // no xhr request!!
        
        // assume data loads finally
        
        myAwesomeModel.getData(); // no xhr request!
        
        // expires based on TTL...
        
        myAwesomeModel.getData(); // xhr request!
        myAwesomeModel.getData(); // no xhr request!
        
        uhOhAnotherService.getData(); // no xhr request!
      })
      .factory('uhOhAnotherService', function(myAwesomeModel) {
        return {
          getData: function() {
            // Hmm I actually want the data from myAwesomeModel
            return myAwesomeModel.getData();
          }
        }
      });

But not have our models looks like...

    angular.module('myAwesomeApp')
      .factory('myNotSoAwesomeModel', function($q, $http) {
        var cache = null,
          promises = [],
          ttl_in_ms = 2000,
          purge_date = null;
          
        return {
          clearData: function() {
            cache = null;
          },
          getData: function() {
            var deferred = $q.defer();

            if (purge_date !== null && purge_date < new Date().getTime()) {
              this.clearData();
            }
            
            if (promises.length > 0) {
              promises.push(deferred);
            }
            else if (cache === null) {
              promises.push(deferred);
              $http.get('my/data/').then(
                function(response) {
                  cache = response;
                  while (promises.length) {
                    promises.shift().resolve(cache);
                  }
                  purge_date = new Date().getTime() + ttl_in_ms;
                }
              );
            }
            else {
              deferred.resolve(cache);
            }
            
            return deferred.promise;
          }
        };
      });

Never fear! angular-promise-cache provides the above implementation in a simple, reusable service that integrates into any promise.


Installation
---------
Bower:  

    bower install angular-promise-cache --save

npm:

    npm install angular-promise-cache --save
    
Manual:
* [Development Build](http://devbuild)
* [Minified/Production Build](http://prodbuild)

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
            return promiseCache({
              promise: function() {
                return $http.get('/my/data');
              }
            });
          }
        };
      });
***
**Voila!**

API
-------
promiseCache(opts)

    opts: {
      // The method we only want to "cache". Required
      promise: function,
      
      // The amount of milliseconds we will cache the above response. Default is 5000
      ttl: int,
      
      // A manual lever to bust the cache. Default is false
      bustCache: boolean,
      
      // Identifier for this cached promise. Default is promise.toString()
      key: string
    }

Example
---------
Please view the detailed [demo](https://github.com/chrisronline/angular-promise-cache/blob/master/example/example.html)

Testing
---------
Requires:
* Karma
* PhantomJS

To run:

    karma start
    karma run
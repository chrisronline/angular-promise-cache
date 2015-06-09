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

But not have our models look like...

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

Never fear! angular-promise-cache provides the above implementation in a simple, reusable service that integrates with any promise.


Installation
---------
Bower:

    bower install angular-promise-cache --save

npm:

    npm install angular-promise-cache --save

Manual:
* [Development Build](https://raw.github.com/chrisronline/angular-promise-cache/master/angular-promise-cache.js)
* [Minified/Production Build](https://raw.github.com/chrisronline/angular-promise-cache/master/angular-promise-cache.min.js)

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

      // The amount of milliseconds we will cache the promise response. Default is 5000
      // [v0.0.7] Providing a value of -1 will ensure the promise is never expired
      ttl: int,

      // A manual lever to expire the cache. Default is false
      bustCache: boolean,

      // Identifier for the cached promise. Default is promise.toString()
      // This is useful if you are creating different promises that need to share the same cache
      key: string,

      // List of arguments to pass into the promise function
      args: array

      // [v0.0.3]
      // This function is called on promise failure and returning true will forcefully expire
      // the cache for this promise
      expireOnFailure: function,

      // [v0.0.5]
      // If true, the response from the promise will be cached in local storage based on the ttl
      localStorageEnabled: boolean,
      // Determines the key that will be used to store within local storage
      // If omitted, will default to the 'key' identifier used above
      localStorageKey: string
    }

Manual Remove
--------
Added in v0.0.7, the remove method will manually expire a promise cached and delete it from local storage (if local storage is enabled). Please see the tests for more information on usage.

```js
// @strPromise is the unique key of the cached promise
// @keepInLS boolean indicating if the cached promise should remain in local storage (if enabled)
promiseCache.remove(strPromise, keepInLS);

```

Added in v0.0.10, removeAll iterates over all cached promises and calls .remove()

```js
// @keepInLS boolean indicating if the cached promise should remain in local storage (if enabled)
promiseCache.removeAll(keepInLS);

```

Events
--------
Added in v0.0.5, the following events are now supported:

```js
$scope.$on('angular-promise-cache.new', function(evt, key, strPromise) {
    // @key ${PROMISE_CACHE_CREATION_TIMESTAMP}$
    // @strPromise unique identifier for the promise
    // Fired when calling when an uncached promise
});
$scope.$on('angular-promise-cache.expired', function(evt, key, strPromise) {
    // @key ${PROMISE_CACHE_CREATION_TIMESTAMP}$
    // @strPromise unique identifier for the promise
    // Fired when a promise expired
});
$scope.$on('angular-promise-cache.active', function(evt, key, expireTimestamp, strPromise) {
    // @key ${PROMISE_CACHE_CREATION_TIMESTAMP}$
    // @expireTimestamp {PROMISE_EXPIRATION_TIMESTAMP}
    // @strPromise unique identifier for the promise
    // Fired when a cached promise is returned
});

[v0.0.7]
$scope.$on('angular-promise-cache.removed', function(evt, strPromise) {
    // @strPromise unique identifier for the promise
    // Fired when a cached promise is manually removed
});

```
For actual examples, please view the source of the example application.

Example
---------
Please view the detailed [demo](http://www.chrisronline.com/angular-promise-cache/example/example.html)

Testing
---------

    gulp test

Release Notes
---------
- v0.0.12 - Fixing issue #9
- v0.0.11 - Fixing issue #8
- v0.0.10 - Fixing issue #6
- v0.0.9 - Fixing issue #5
- v0.0.8 - Fixing issue #4
- v0.0.7 - Adding support for a remove method and ttl=-1
- v0.0.6 - Fixing issue #2
- v0.0.5 - Added local storage support
- v0.0.4 - (skipped)
- v0.0.3 - Added expireOnFailure functionality

/**
@license
The MIT License (MIT)

Copyright (c) 2013 Chris Roberson

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function(window, angular, undefined) {

  'use strict';

  angular.module('angular-promise-cache', [])
    .factory('promiseCache', ['$q', '$rootScope', function($q, $rootScope) {
      var memos = {},
        DEFAULT_TTL_IN_MS = 5000,
        keyDelimiter = '$',
        whitespaceRegex = /\s+/g,
        dateReferences = {},
        ls = window.localStorage || {
          setItem: function() { },
          removeItem: function() { },
          getItem: function() { }
        },
        hasOwnProperty = Object.prototype.hasOwnProperty,
        store = function(key, complexValue) {
          ls.setItem(key, JSON.stringify(complexValue));
        },
        remove = function(key) {
          ls.removeItem(key);
        },
        fetch = function(key) {
          var str = ls.getItem(key);
          try {
            str = JSON.parse(str);
          }
          catch (e) {
            console.warn('Unable to parse json response from local storage', str);
          }
          return str;
        },

        getTimestamp = function(key, strPromise) {
          return parseInt(key.split(keyDelimiter)[1]) || dateReferences[strPromise];
        },
        formatCacheKey = function(ts) {
          return keyDelimiter + ts + keyDelimiter;
        },
        getStrPromise = function(opts) {
          return opts.key || opts.promise.toString().replace(whitespaceRegex, '')
        },
        isLsEnabled = function(opts) {
          return !!opts.localStorageEnabled;
        },
        getLsKey = function(opts, strPromise) {
          return opts.localStorageKey || strPromise;
        },

        memoize = function memoize(func, resolver) {
            var keyPrefix = +new Date + '',
              memoized = function() {
                var cache = memoized.cache,
                    key = resolver ? resolver.apply(this, arguments) : keyPrefix + arguments[0];

                return hasOwnProperty.call(cache, key)
                  ? cache[key]
                  : (cache[key] = func.apply(this, arguments));
              }
            memoized.cache = {};
            return memoized;
          };

      var promiseCacheFunction = function(opts) {
        // TODO: BETTER ERROR HANDLING
        var promise = opts.promise,
          ttl = parseInt(opts.ttl) || DEFAULT_TTL_IN_MS,
          bustCache = !!opts.bustCache,
          // v0.0.3: Adding ability to specify a callback function to forcefully expire the cache
          // for a promise that returns a failure
          expireOnFailure = opts.expireOnFailure,
          args = opts.args,
          now = new Date().getTime(),
          strPromise = getStrPromise(opts),

          // v0.0.5: Local storage support
          lsEnabled = isLsEnabled(opts),
          lsKey = getLsKey(opts, strPromise),
          lsObj = fetch(lsKey),
          lsTs,
          lsMemoCache,
          lsDuration,
          lsDeferred;

        dateReferences[strPromise] = dateReferences[strPromise] || now;

        if (lsEnabled) {
          if (!lsObj || typeof lsObj !== 'object' || !hasOwnProperty.call(lsObj, 'resolver') || !hasOwnProperty.call(lsObj, 'response')) {
            lsObj = {};
          }
          else {
            // v0.0.5: Local Storage support

            // Extract the timestamp from the local storage object
            // This timestamp represents the last time this promise
            // expired
            lsTs = getTimestamp(lsObj.resolver, strPromise);

            // Determine how much longer it has to live
            lsDuration = lsTs + ttl - now;

            // Memoize the promise using the timestamp from the
            // local storage object rather than dateReference
            memos[strPromise] = memoize(promise, function() {
              return formatCacheKey(lsTs);
            });

            // We want to fill the cache immediately but do not
            // want to execute the promise and since the cache
            // property is just a simple key/value object, we
            // can create that and set it without any harm
            lsMemoCache = memos[strPromise].cache || {};
            lsDeferred = $q.defer();
            lsDeferred.resolve(lsObj.response);
            lsMemoCache[formatCacheKey(lsTs)] = lsDeferred.promise;
            memos[strPromise].cache = lsMemoCache;
          }
        }

        if (!hasOwnProperty.call(memos, strPromise)) {
          memos[strPromise] = memoize(promise, function() {
            return formatCacheKey(dateReferences[strPromise]);
          });
          memos[strPromise].opts = opts;
          $rootScope.$broadcast('angular-promise-cache.new', formatCacheKey(dateReferences[strPromise]), strPromise);
        }
        else {
          memos[strPromise].opts = opts;
          memos[strPromise].cache = (function() {
            var updatedCache = {},
              cache = memos[strPromise].cache,
              forceExpiration = !!memos[strPromise].forceExpiration,
              key,
              timestamp,
              omit;

            for (key in cache) {
              timestamp = getTimestamp(key, strPromise);
              // v0.0.7: TTL < 0 means it never expires
              omit      = bustCache || forceExpiration || (ttl > 0 && timestamp + ttl < now);

              if (omit) {
                $rootScope.$broadcast('angular-promise-cache.expired', key, strPromise);
                dateReferences[strPromise] = now;
                if (lsEnabled) {
                  lsTs = dateReferences[strPromise];
                  remove(lsKey);
                }
              }
              else {
                $rootScope.$broadcast('angular-promise-cache.active', key, timestamp + ttl, strPromise);
                updatedCache[key] = cache[key];
              }
            }

            // Always reset this after expiring the cache
            // so it is not "stuck on"
            memos[strPromise].forceExpiration = false;

            return updatedCache;
          }());
        }

        return memos[strPromise].apply(this, args || []).then(
          function(response) {
            if (lsEnabled) {
              lsObj.response = arguments[0];
              lsObj.resolver = formatCacheKey(lsTs || dateReferences[strPromise]);
              store(lsKey, lsObj);
            }
            return response;
          },
          function(error) {
            if (angular.isFunction(expireOnFailure) && expireOnFailure.apply(this, arguments)) {
              memos[strPromise].forceExpiration = true;
            }
            return $q.reject(error);
          }
        );
      };

      // v0.0.7
      promiseCacheFunction.remove = function(key, keepInLS) {
        if (!memos[key]) return;
        var opts = memos[key].opts;
        dateReferences[key] = new Date().getTime();
        if (!keepInLS && isLsEnabled(opts)) {
          remove(getLsKey(opts, key));
        }
        delete memos[key];
        $rootScope.$broadcast('angular-promise-cache.removed', key);
      };

      promiseCacheFunction.removeAll = function(keepInLS) {
        Object.keys(memos).forEach(function(key) {
          promiseCacheFunction.remove(key, keepInLS);
        });
      };

      return promiseCacheFunction;
    }]);

})(window, window.angular);

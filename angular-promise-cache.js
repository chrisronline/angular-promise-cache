/**
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
'use strict';

angular.module('angular-promise-cache', [])
  .factory('promiseCache', ['$q', '$rootScope', function($q, $rootScope) {
    var memos = {},
      DEFAULT_TTL_IN_MS = 5000,
      keyDelimiter = '$',
      whitespaceRegex = /\s+/g,
      dateReference,
      ls = window.localStorage,
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

      getTimestamp = function(key) {
        return parseInt(key.split(keyDelimiter)[1]) || dateReference;
      },
      formatCacheKey = function(ts) {
        return keyDelimiter + ts + keyDelimiter;
      },

      memoize = typeof _ !== 'undefined' && hasOwnProperty.call(_, 'memoize') ? _.memoize :
        function memoize(func, resolver) {
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


    return function(opts) {
      // TODO: BETTER ERROR HANDLING
      var promise = opts.promise,
        ttl = parseInt(opts.ttl) || DEFAULT_TTL_IN_MS,
        bustCache = !!opts.bustCache,
        // v0.0.3: Adding ability to specify a callback function to forcefully expire the cache
        // for a promise that returns a failure
        expireOnFailure = opts.expireOnFailure,
        args = opts.args,
        now = new Date().getTime(),
        strPromise = opts.key || promise.toString().replace(whitespaceRegex, ''),

        // v0.0.5: Local storage support
        lsEnabled = !!opts.localStorageEnabled,
        lsKey = opts.localStorageKey || strPromise,
        lsObj = fetch(lsKey),
        lsTs,
        lsMemoCache,
        lsDuration,
        lsDeferred;

      dateReference = dateReference || now;

      if (lsEnabled) {
        if (!lsObj || typeof lsObj !== 'object' || !hasOwnProperty.call(lsObj, 'resolver') || !hasOwnProperty.call(lsObj, 'response')) {
          lsObj = {};
        }
        else {
          // v0.0.5: Local Storage support

          // Extract the timestamp from the local storage object
          // This timestamp represents the last time this promise
          // expired
          lsTs = getTimestamp(lsObj.resolver);

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
          return formatCacheKey(dateReference);
        });
        $rootScope.$broadcast('angular-promise-cache.new', formatCacheKey(dateReference));
      }
      else {
        memos[strPromise].cache = (function() {
          var updatedCache = {},
            cache = memos[strPromise].cache,
            forceExpiration = !!memos[strPromise].forceExpiration,
            key,
            timestamp,
            omit;

          for (key in cache) {
            timestamp = getTimestamp(key);
            omit      = bustCache || forceExpiration || timestamp + ttl < now;

            if (omit) {
              $rootScope.$broadcast('angular-promise-cache.expired', key);
              dateReference = now;
              if (lsEnabled) {
                lsTs = dateReference;
                remove(lsKey);
              }
            }
            else {
              $rootScope.$broadcast('angular-promise-cache.active', key, timestamp + ttl);
              updatedCache[key] = cache[key];
            }
          }

          // Always reset this after expiring the cache
          // so it is not "stuck on"
          memos[strPromise].forceExpiration = false;

          return updatedCache;
        }());
      }

      return memos[strPromise].apply(this, args).then(
        function(response) {
          if (lsEnabled) {
            lsObj.response = arguments[0];
            lsObj.resolver = formatCacheKey(lsTs || dateReference);
            store(lsKey, lsObj);
          }
          return response;
        },
        function(error) {
          if (angular.isFunction(expireOnFailure)) {
            memos[strPromise].forceExpiration = true;
          }
          return $q.reject(error);
        }
      );
    }
  }]);
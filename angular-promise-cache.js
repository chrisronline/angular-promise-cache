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
  .factory('promiseCacheState', function() {
    var state = {};

    return {
      state: function(key, _state) {
        if (typeof _state !== 'undefined') {
          state[key] = _state;
        }
        return state[key];
      },
      all: function() {
        return state;
      }
    }
  })
  .factory('promiseCache', ['promiseCacheState', function(promiseCacheState) {
    var memos = {},
      DEFAULT_TTL_IN_MS = 5000,
      keyDelimiter = '$',
      whitespaceRegex = /\s+/g,
      dateReference,

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
      var promise = opts.promise,
        ttl = parseInt(opts.ttl),
        bustCache = !!opts.bustCache,
        args = opts.args,
        now = new Date().getTime(),
        strPromise = opts.key || promise.toString().replace(whitespaceRegex, '');

      dateReference = dateReference || now;

      if (!hasOwnProperty.call(memos, strPromise)) {
        memos[strPromise] = memoize(promise, function() {
          return keyDelimiter + dateReference + keyDelimiter + Array.prototype.slice.call(arguments);
        });
        promiseCacheState.state(strPromise, { expired: false, ttl: dateReference + (ttl || DEFAULT_TTL_IN_MS) - now });
      }
      else {
        memos[strPromise].cache = (function() {
          var updatedCache = {},
            cache = memos[strPromise].cache,
            key,
            parts,
            timestamp,
            omit;

          for (key in cache) {
            parts     = key.split(keyDelimiter);
            timestamp = parseInt(parts[1]);
            omit      = bustCache || timestamp + (ttl || DEFAULT_TTL_IN_MS) < now;

            if (omit) {
              dateReference = now;
              promiseCacheState.state(strPromise, { expired: true });
            }
            else {
              updatedCache[key] = cache[key];
              promiseCacheState.state(strPromise, { expired: false, ttl: timestamp + (ttl || DEFAULT_TTL_IN_MS) - now });
            }
          }

          return updatedCache;
        }());
      }

      return memos[strPromise].apply(this, args);
    }
  }]);
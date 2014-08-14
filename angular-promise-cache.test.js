'use strict';

describe('angular-promise-cache', function() {
  var apc,
    q,
    scope;

  beforeEach(module('angular-promise-cache'));
  beforeEach(inject(function($q, $rootScope, promiseCache) {
    q = $q;
    scope = $rootScope;
    apc = promiseCache;
  }));

  it('should be a function', function() {
    expect(typeof apc).toBe('function');
  });

  it('should support caching', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    apc({ promise: getPromise }).then(function(idx) { expect(idx).toBe(1); });
    apc({ promise: getPromise }).then(function(idx) { expect(idx).toBe(1); });
    apc({ promise: getPromise }).then(function(idx) { expect(idx).toBe(1); });
    apc({ promise: getPromise }).then(function(idx) { expect(idx).toBe(1); });
    scope.$apply();
  });

  it('should support cache busting', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    apc({ promise: getPromise }).then(function(idx) { expect(idx).toBe(1); });
    apc({ promise: getPromise }).then(function(idx) { expect(idx).toBe(1); });
    apc({ promise: getPromise, bustCache: true }).then(function(idx) { expect(idx).toBe(2); });
    apc({ promise: getPromise }).then(function(idx) { expect(idx).toBe(2); });
    apc({ promise: getPromise, bustCache: true }).then(function(idx) { expect(idx).toBe(3); });
    apc({ promise: getPromise }).then(function(idx) { expect(idx).toBe(3); });
    scope.$apply();
  });

  it('should support a custom key', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    apc({ promise: getPromise, key: 'apc' }).then(function(idx) { expect(idx).toBe(1); });
    apc({ promise: getPromise, key: 'apc' }).then(function(idx) { expect(idx).toBe(1); });
    apc({ promise: getPromise, key: 'apc', bustCache: true }).then(function(idx) { expect(idx).toBe(2); });
    apc({ promise: getPromise, key: 'apc' }).then(function(idx) { expect(idx).toBe(2); });
    scope.$apply();
  });

  it('should expire', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    runs(function() {
      apc({ promise: getPromise, ttl: 1000 }).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });

    waits(1000);

    runs(function() {
      apc({ promise: getPromise, ttl: 1000 }).then(function(idx) { expect(idx).toBe(2); });
      scope.$apply();
    });
  });

  it('should not expire too early', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    runs(function() {
      apc({ promise: getPromise, ttl: 1000 }).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });

    waits(500);

    runs(function() {
      apc({ promise: getPromise, ttl: 1000 }).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });
  });

  it('should support manually expiring the cache', function() {
    var calls = 0,
      obj = {
        promise: function() {
          var deferred = q.defer();
          if (++calls === 1) {
            deferred.reject(calls);
          }
          else {
            deferred.resolve(calls);
          }
          return deferred.promise;
        },
        ttl: 1000,
        expireOnFailure: function() {
          return true;
        }
      },
      fns = {
        one: function(idx) {
          expect(idx).toBe(1);
        },
        two: function(idx) {
          expect(idx).toBe(2);
        }
      };

    runs(function() {
      spyOn(obj, 'expireOnFailure').andCallThrough();
      spyOn(fns, 'one').andCallThrough();
      apc(obj).then(angular.noop, fns.one);
      scope.$apply();
      expect(fns.one).toHaveBeenCalled();
      expect(obj.expireOnFailure).toHaveBeenCalled();
    });

    waits(500);

    runs(function() {
      spyOn(fns, 'two').andCallThrough();
      apc(obj).then(fns.two);
      scope.$apply();
      expect(fns.two).toHaveBeenCalled();
    });
  });

  it('should support expireOnFailure returning false', function() {
    var calls = 0;
    var obj = {
      key: 'expireOnFailure',
      promise: function() {
        var deferred = q.defer();
        deferred.reject(++calls);
        return deferred.promise;
      },
      ttl: 1000,
      expireOnFailure: function() { return false; }
    };
    var fns =  {
      one: function(idx) { expect(idx).toBe(1); }
    };

    runs(function() {
      apc(obj);
      scope.$apply();
    });

    waits(500);

    runs(function() {
      spyOn(fns, 'one').andCallThrough();
      apc(obj).then(angular.noop, fns.one);
      scope.$apply();
      expect(fns.one).toHaveBeenCalled();
    });
  });

  it('should fire events', function() {
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve();
      return deferred.promise;
    }

    function reset() {
      newFired = false;
      expiredFired = false;
      activeFired = false;
    }

    var ttl = 500;

    var newFired = false,
      expiredFired = false,
      activeFired = false;

    scope.$on('angular-promise-cache.new', function() { newFired = true; });
    scope.$on('angular-promise-cache.expired', function() { expiredFired = true; });
    scope.$on('angular-promise-cache.active', function() { activeFired = true; });

    runs(function() {
      apc({ promise: getPromise, ttl: ttl });
      expect(newFired).toBe(true);
      expect(expiredFired).toBe(false);
      expect(activeFired).toBe(false);
      reset();
    });

    runs(function() {
      apc({ promise: getPromise, ttl: ttl });
      expect(newFired).toBe(false);
      expect(expiredFired).toBe(false);
      expect(activeFired).toBe(true);
      reset();
    });

    waits(ttl);

    runs(function() {
      apc({ promise: getPromise, ttl: ttl });
      expect(newFired).toBe(false);
      expect(expiredFired).toBe(true);
      expect(activeFired).toBe(false);
      reset();
    });

  });

  //v0.0.4 Local Storage
  describe('localStorage support', function() {
    var ls = window.localStorage,
      lsKey = 'test';

    afterEach(function() {
      ls.removeItem(lsKey);
    });

    it('should support local storage', function() {
      apc({
        promise: function() {
          var deferred = q.defer();
          deferred.resolve();
          return deferred.promise;
        },
        localStorageEnabled: true,
        localStorageKey: lsKey
      });

      scope.$apply();
      expect(ls.getItem(lsKey)).not.toBeNull();
    });

    it('should gracefully handle failed local storage deserialization', function() {
      // Bad value
      ls.setItem(lsKey, 'foo');

      apc({
        promise: function() {
          var deferred = q.defer();
          deferred.resolve();
          return deferred.promise;
        },
        localStorageEnabled: true,
        localStorageKey: lsKey
      });

      scope.$apply();
      expect(ls.getItem(lsKey)).not.toBeNull();

      // Bad key

      ls.setItem(lsKey, '{"response":null,"resolver":"foo"}');

      apc({
        promise: function() {
          var deferred = q.defer();
          deferred.resolve();
          return deferred.promise;
        },
        localStorageEnabled: true,
        localStorageKey: lsKey
      });

      scope.$apply();
      expect(ls.getItem(lsKey)).not.toBeNull();
    });

    it('should remove the item on expiration', function() {
      var calls = 0,
        ttl = 500;

      function getPromise() {
        var deferred = q.defer();
        // The promise response will be resaved on successfull promise
        // resolution so we need to reject the one that should fail
        if (++calls === 2) {
          deferred.reject();
        }
        else {
          deferred.resolve();
        }
        return deferred.promise;
      }

      runs(function() {
        apc({
          promise: getPromise,
          ttl: ttl,
          localStorageEnabled: true,
          localStorageKey: lsKey
        });
        scope.$apply();
        expect(ls.getItem(lsKey)).not.toBeNull();
      });

      waits(ttl);

      runs(function() {
        apc({
          promise: getPromise,
          ttl: ttl,
          localStorageEnabled: true,
          localStorageKey: lsKey
        });
        scope.$apply();
        expect(ls.getItem(lsKey)).toBeNull();
      });
    });
  });

  it('should not expire all items when on expires', function() {
    var calls1 = 0, calls2 = 0;
    function getPromise1() {
      var deferred = q.defer();
      deferred.resolve(++calls1);
      return deferred.promise;
    }

    function getPromise2() {
      var deferred = q.defer();
      deferred.resolve(++calls2);
      return deferred.promise;
    }

    var one = { key: 1, promise: getPromise1, ttl: 1000 };
    var two = { key: 2, promise: getPromise2, ttl: 500 };

    runs(function() {
      apc(one).then(function(idx) { expect(idx).toBe(1); });
      apc(two).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });

    waits(500);

    runs(function() {
      apc(one).then(function(idx) { expect(idx).toBe(1); });
      apc(two).then(function(idx) { expect(idx).toBe(2); });
      scope.$apply();
      apc(one).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });
  });

  it('should never expire if ttl === -1', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    var one = { promise: getPromise, ttl: -1 };

    runs(function() {
      apc(one).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });
    waits(4000);
    runs(function() {
      apc(one).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });
    waits(4000);
    runs(function() {
      apc(one).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });
  });

  // v0.0.7
  it('should support remove', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    var one = { key: 'test', promise: getPromise, localStorageEnabled: true };


    apc(one).then(function(idx) { expect(idx).toBe(1); });
    scope.$apply();
    apc.remove('test');
    scope.$apply();
    apc(one).then(function(idx) { expect(idx).toBe(2); });
    expect(window.localStorage.getItem(one.key)).toBeNull();
    scope.$apply();
    apc.remove('test', true);
    apc(one).then(function(idx) { expect(idx).toBe(3); });
    expect(window.localStorage.getItem(one.key)).not.toBeNull();
  });

  // v0.0.10
  it('should support removeAll', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    var one = { key: 'test', promise: getPromise };
    var two = { key: 'test2', promise: getPromise };

    apc(one);
    apc(two);
    scope.$apply();
    apc.removeAll();
    scope.$apply();

    apc(one).then(function(idx) { expect(idx).toBe(3); });
    apc(two).then(function(idx) { expect(idx).toBe(4); });
    scope.$apply();
  });
});

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
        expireOnFailure: function(request) {
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
      spyOn(fns, 'one').andCallThrough();
      apc(obj).then(angular.noop, fns.one);
      scope.$apply();
      expect(fns.one).toHaveBeenCalled();
    });

    waits(500);

    runs(function() {
      spyOn(fns, 'two').andCallThrough();
      apc(obj).then(fns.two);
      scope.$apply();
      expect(fns.two).toHaveBeenCalled();
    });
  });
});
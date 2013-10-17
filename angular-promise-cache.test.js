'use strict';

describe('angular-promise-cache', function() {
  var apc,
    q,
    scope,
    state;

  beforeEach(module('angular-promise-cache'));
  beforeEach(inject(function($q, $rootScope, promiseCache, promiseCacheState) {
    q = $q;
    scope = $rootScope;
    apc = promiseCache;
    state = promiseCacheState;
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

  it('should set the state', function() {
    var calls = 0;
    function getPromise() {
      var deferred = q.defer();
      deferred.resolve(++calls);
      return deferred.promise;
    }

    runs(function() {
      apc({ promise: getPromise, key: 'apc', ttl: 1000 }).then(function(idx) { expect(idx).toBe(1); });
      scope.$apply();
    });

    waits(500);

    runs(function() {
      apc({ promise: getPromise, key: 'apc', ttl: 1000 })
      expect(state.state('apc').expired).toBe(false);
      expect(state.state('apc').ttl < 500).toBe(true);
    });

    waits(500);

    runs(function() {
      apc({ promise: getPromise, key: 'apc', ttl: 1000 });
      scope.$apply();
      expect(state.state('apc').expired).toBe(true);
    });
  });
});
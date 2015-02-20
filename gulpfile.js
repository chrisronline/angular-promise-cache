var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var karma = require('gulp-karma');

gulp.task('build', function() {
  return gulp.src('angular-promise-cache.js')
    .pipe(uglify({preserveComments: 'some'}))
    .pipe(rename('angular-promise-cache.min.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('test', function() {
  return gulp.src([
      'bower_components/angular/angular.min.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'angular-promise-cache.js',
      'angular-promise-cache.test.js'
    ])
    .pipe(karma({configFile:'karma.conf.js',action:'run'}));
});

gulp.task('version', function() {
  var bump = require('gulp-bump');
  gulp.src(['./bower.json', './package.json'])
    .pipe(bump())
    .pipe(gulp.dest('./'));
});

gulp.task('default', ['test', 'build']);

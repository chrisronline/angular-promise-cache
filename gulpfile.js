var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var karma = require('gulp-karma');
var Server = require('karma').Server;

gulp.task('build', function() {
  return gulp.src('angular-promise-cache.js')
    .pipe(uglify({preserveComments: 'some'}))
    .pipe(rename('angular-promise-cache.min.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('test', function(done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});

gulp.task('version', function() {
  var bump = require('gulp-bump');
  gulp.src(['./bower.json', './package.json'])
    .pipe(bump())
    .pipe(gulp.dest('./'));
});

gulp.task('default', ['test', 'build']);

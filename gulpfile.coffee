gulp = require 'gulp'
gutil = require 'gutil'
p = require('gulp-load-plugins')() # loading gulp plugins lazily
_ = require 'lodash'
argv = require('yargs').argv
watch = require 'gulp-debounced-watch'

# -----------------------------------------------------------------------------
# Create representation of file/directory structure
libRoot =  "lib"
cliRoot =  "cli"
buildRoot =  "dist"

coffeeFiles = ["#{libRoot}/**/*.coffee", "#{cliRoot}/**/*.coffee"]
jsFiles = ["#{libRoot}/**/*.js", "#{cliRoot}/**/*.js"]

# -----------------------------------------------------------------------------
# Create a gulp task, and orchestrate it with default functions
GulpSrc = (srcFiles, taskName, srcOptions = {}) ->
  gulp.src srcFiles, srcOptions
  .pipe p.cached taskName
  .pipe p.using {}
  .pipe p.size()

# -----------------------------------------------------------------------------
# handle src coffeescript files: static compilation
gulp.task 'coffee', ->
  GulpSrc coffeeFiles, 'coffee', {base: '.'}
  .pipe p.coffeelint()
  .pipe p.coffeelint.reporter()
  .pipe p.coffee(bare:true).on 'error', (err)->p.util.log err;@emit 'end'
  .pipe gulp.dest buildRoot

# -----------------------------------------------------------------------------
gulp.task 'js', ->
  GulpSrc jsFiles, 'js', {base: '.'}
  .pipe gulp.dest buildRoot

# -----------------------------------------------------------------------------
gulp.task 'watch', ['setup'], ->
  watch coffeeFiles, {debounceTimeout: 1000}, ->
    gulp.start ['coffee']
    # gulp.start ['coffee', 'unittest']
  watch jsFiles, {debounceTimeout: 1000}, ->
    gulp.start ['js']
    # gulp.start ['js', 'unittest']

# -----------------------------------------------------------------------------
gulp.task 'setup', ['js', 'coffee'], ->
  GulpSrc ["#{libRoot}/**/*.csv"], 'setup', {base: '.'}
  .pipe gulp.dest buildRoot

# -----------------------------------------------------------------------------
gulp.task 'unittest', ['setup'], ->
  gulp.src ["#{libRoot}/test/unittest/index.coffee", "#{libRoot}/**/*unit-tests.coffee"], {read: false}
    .pipe p.coffee({bare: true}).on('error', gutil.log)
    .pipe p.mocha
      reporter: 'spec'
      ui: 'bdd'
      recursive: true
    .once 'error', -> process.exit 1
    .once 'end', -> process.exit()

# -----------------------------------------------------------------------------
# gulp.task 'systemtest', ->
gulp.task 'systemtest', ['setup'], ->
  gulp.src ["#{libRoot}/test/systemtest/index.coffee", "#{libRoot}/**/*system-tests.coffee"], {read: false}
    .pipe p.coffee({bare: true}).on('error', gutil.log)
    .pipe p.mocha
      reporter: 'spec'
      ui: 'bdd'
      recursive: true
    .once 'error', -> process.exit 1
    .once 'end', -> process.exit()


# -----------------------------------------------------------------------------
gulp.task 'default', ['setup', 'watch']


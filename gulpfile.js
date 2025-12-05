import { src, dest, series, parallel, watch } from 'gulp';
import { deleteAsync } from 'del';
import browserSync from 'browser-sync';
import pug from 'gulp-pug';
import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import * as esbuild from 'esbuild';
import plumber from 'gulp-plumber';

const sass = gulpSass(dartSass);
const bs = browserSync.create();
const isProd = process.env.NODE_ENV === 'production';




export function copyRoot() {
  return src([
    './*.{ico,png,svg,webmanifest,json,txt}',
  ])
  .pipe(dest('dist'));
}

export function copyData() {
  return src('src/pug/_data/*.json')
    .pipe(dest('dist/js'));
}


function safePlumber(context = "") {
  return plumber({
    errorHandler: function (err) {
      console.log(`❌ ${context} ERROR:`, err.message);
      this.emit('end');
    }
  });
}

// ПРОСТОЙ И РАБОЧИЙ ВОТЧЕР
function setupPugWatcher() {
  let timeout;

  function rebuildAllPages() {
    console.log('🔄 Rebuilding ALL pages...');
    return src('src/pug/pages/**/*.pug')
      .pipe(safePlumber("PUG"))
      .pipe(pug({
        basedir: 'src/pug',
        pretty: !isProd,
        cache: false // ← ВАЖНО: отключаем кэш
      }))
      .pipe(dest('dist'))
      .pipe(bs.stream());
  }

  // СТРАНИЦЫ - только измененная
  watch('src/pug/pages/**/*.pug').on('change', (file) => {
    console.log('📄 Page changed:', file);
    src(file, { base: 'src/pug/pages' })
      .pipe(safePlumber("PUG"))
      .pipe(pug({
        basedir: 'src/pug',
        pretty: !isProd,
        cache: false
      }))
      .pipe(dest('dist'))
      .pipe(bs.stream());
  });

  // КОМПОНЕНТЫ и МИКСИНЫ - ВСЕ страницы
  watch(['src/pug/components/**/*.pug', 'src/pug/mixins/**/*.pug', 'src/pug/layouts/**/*.pug']).on('change', (file) => {
    console.log('⚡ Template changed:', file);
    clearTimeout(timeout);
    timeout = setTimeout(rebuildAllPages, 200);
  });
}

export function flags() {
  return src('./node_modules/flag-icons/flags/1x1/*.svg')
    .pipe(dest('dist/flags/1x1'));
}

export function clean() {
  return deleteAsync(['dist']);
}

export function pages() {
  return src('src/pug/pages/**/*.pug')
    .pipe(safePlumber("PUG"))
    .pipe(pug({
      basedir: 'src/pug',
      pretty: !isProd,
      cache: false
    }))
    .pipe(dest('dist'));
}

export function styles() {
  return src('src/styles/main.{sass,scss}')
    .pipe(safePlumber("SASS"))
    .pipe(
      sass({
        outputStyle: "expanded",
        includePaths: ["node_modules"]   // ← ДОБАВИТЬ ВАЖНО!
      }).on("error", sass.logError)
    )
    .pipe(postcss([
      autoprefixer(),
      ...(isProd ? [cssnano()] : [])
    ]))
    .pipe(dest('dist/css'))
    .pipe(bs.stream());
}


export async function scripts() {
  try {
    await esbuild.build({
      entryPoints: ['src/scripts/main.js'],
      outfile: 'dist/js/main.js',
      bundle: true,
      minify: isProd,
      sourcemap: !isProd,
    });
  } catch (err) {
    console.log("❌ SCRIPTS ERROR:", err.message);
  }
  bs.reload();
}

export function images() {
  return src(['src/images/**/*', '!src/images/static/**'])
    .pipe(dest('dist/images'));
}

export function staticAssets() {
  return src('src/images/static/**/*')
    .pipe(dest('dist/images/static'));
}

export function fonts() {
  return src('src/fonts/**/*', { encoding: false })
    .pipe(dest('dist/fonts'));
}

function server(done) {
  bs.init({
    server: 'dist',
    open: false,
    notify: false,
    port: 3000
  });
  done();
}

function watcher() {
  setupPugWatcher();
  watch('src/styles/**/*.{sass,scss}', styles);
  watch('src/scripts/**/*.js', scripts);
  watch('src/images/**/*', images);
}

export const build = series(
  clean,
  parallel(pages, styles, scripts, images, staticAssets, fonts, flags, copyRoot, copyData)
);

export default series(
  clean,
  parallel(pages, styles, scripts, images, staticAssets, fonts, flags, copyRoot, copyData),
  parallel(server, watcher)
);
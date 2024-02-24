const mix = require('laravel-mix');
require('laravel-mix-obfuscator');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for your Laravel application. By default, we are compiling the Sass
 | file for the application as well as bundling up all the JS files.
 |
 */

/* Orchid mix config start */

if (!mix.inProduction()) {
    mix
        .webpackConfig({
            devtool: 'source-map',
        })
        .sourceMaps();
} else {
    mix.options({
        clearConsole: true,
        terser: {
            terserOptions: {
                compress: {
                    drop_console: true,
                },
            },
        },
    });
}

mix
    .sass('resources/sass/app.scss', 'css/dashy.css', {
        implementation: require('node-sass'),
    })
    .options({
        processCssUrls: false,
    })
    .js('resources/js/app.js', 'js/dashy.js')
    .extract([
        'stimulus', 'stimulus/webpack-helpers', 'turbo',
        'popper.js', 'bootstrap',
        'dropzone', 'cropperjs', 'tom-select', 'frappe-charts', 'inputmask',
        'simplemde', 'axios', 'leaflet', 'codeflask',
        'flatpickr', 'quill', 'codemirror', 'typo-js', 'sortablejs',
        'node:zlib', 'node-fetch', 'pusher-js', '@fullcalendar/daygrid',
        '@fullcalendar/timegrid', '@fullcalendar/list', '@fullcalendar/interaction',
        '@fullcalendar/google-calendar', '@pusher/push-notifications-web', '@fullcalendar/core'
    ])
    .setPublicPath('public')
    .version();



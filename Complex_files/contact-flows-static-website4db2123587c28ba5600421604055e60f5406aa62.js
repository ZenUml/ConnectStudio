/**
 * External Asset Loader
 *
 * Copied from ../contact-lens
 */

(function (global, document) {
    'use strict';

    // ====== API definition =======
    var publicAPIs = {};

    publicAPIs.init  = function (options) {
        var noop = function () {};
        var defaultOpts = {

            // Required params
            assetsURL: '',
            manifestURL: '',

            // Default locale
            locale: 'en_US'
        };

        options = Object.assign({}, defaultOpts, options);
        validateOptions(options);
        return loadAssets(options);
    };

    global.LilyExternalAssetLoader = publicAPIs;


    // ====== Helper Functions =======

    function validateOptions (options) {
        if (!options.assetsURL || !options.manifestURL) {
            throw new Error('assetsURL and manifestURL are required');
        }
    }

    function loadAssets (options) {
        return global.fetch(options.manifestURL, { credentials: 'include' })
            .then(function (res) {
                return res.json();
            })
            .then(function (manifest) {
                var languagePack = manifest[options.locale] || manifest.en_US || {};
                var entryPoints = Object.keys(languagePack).map(function (key) {
                    return languagePack[key];
                });
                return Promise.all(processFiles(options.assetsURL, entryPoints));
            });
    }

    function processFiles (baseURL, entryPoints) {
        return entryPoints
            .map(function (path) {
                if (extractFileExtension(path) === 'js') {
                    return loadScript(baseURL, path);
                } else if (extractFileExtension(path) === 'css') {
                    return loadStyle(baseURL, path);
                }
                return Promise.resolve(null);
            });
    }

    function loadScript (baseURL, path) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = buildURL(baseURL, path);
            script.type = 'text/javascript';
            script.onload = resolve.bind(script);
            script.onerror = reject.bind(script);
            appendToHead(script);
        });
    }

    function loadStyle (baseURL, path) {
        return new Promise(function (resolve, reject) {
            var link = document.createElement('link');
            link.href = buildURL(baseURL, path);
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.onload = resolve.bind(link);
            link.onerror = reject.bind(link);
            appendToHead(link);
        });
    }

    function appendToHead (el) {
        var head = document.head || document.getElementsByTagName('head')[0];
        head.appendChild(el);
    }

    function extractFileExtension (filePath) {
        return filePath.substr(filePath.lastIndexOf('.') + 1);
    }

    function buildURL (baseURL, path) {
        return baseURL + '/' + path;
    }

})(window, document);

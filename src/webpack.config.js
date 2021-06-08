/**
 * Webpack configuration
 * Typescript / Web Components / SCSS
 * Version 3.4
 */

"use strict";

require("dotenv").config();

const path = require("path");
const mkdirp = require("mkdirp");
const childProcess = require("child_process");
const webpack = require("webpack");

const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');

let projectVersion = "v0.0.0";
try {
    projectVersion = childProcess.execSync("git describe --tags").toString().trim();
}
catch {}

////////////////////////////////////////////////////////////////////////////////
// CONFIGURATION

const defaultTarget = "web";
const useDevServer = false;
const projectDir = path.resolve(__dirname, "..");

const dirs = {
    source: path.resolve(projectDir, "src"),
    //assets: path.resolve(projectDir, "src/renderer/assets"),
    output: path.resolve(projectDir, "bin"),
    //static: path.resolve(projectDir, "bin/assets"),
    modules: path.resolve(projectDir, "node_modules"),
    jsFolder: "", // "js/",
    cssFolder: "", // "css/",
};

// create folders if necessary
mkdirp.sync(dirs.output)

// module search paths
const modules = [
    dirs.modules,
];

// import aliases
const alias = {
    "@ff/core": path.resolve(dirs.modules, "@framefactory/core/src"),
    "@ff/browser": path.resolve(dirs.modules, "@framefactory/browser/src"),
};

// project components to be built
const components = {
    "main": {
        bundle: "index",
        subdir: "main",
        target: "electron-main",
        entry: "main/index.ts",
    },
    "renderer": {
        bundle: "index",
        subdir: "renderer",
        target: "electron-renderer",
        title: "template",
        version: projectVersion,
        entry: "renderer/index.ts",
        template: "renderer/index.hbs",
        element: "<ff-application></ff-application>",
    },
};

////////////////////////////////////////////////////////////////////////////////

module.exports = function(env, argv)
{
    const environment = {
        isDevMode: argv.mode !== undefined ? argv.mode !== "production" : process.env["NODE_ENV"] !== "production",
    };

    console.log(`
WEBPACK - PROJECT BUILD CONFIGURATION
      build mode: ${environment.isDevMode ? "development" : "production"}
   source folder: ${dirs.source}
   output folder: ${dirs.output}
  modules folder: ${dirs.modules}
    `);

    const componentKey = argv.component !== undefined ? argv.component : "all";
    let configurations = null;
  
    if (componentKey === "all") {
        configurations = Object.keys(components).map(key => createBuildConfiguration(environment, dirs, components[key]));
    }
    else {
        const component = components[componentKey];
  
        if (component === undefined) {
            console.warn(`\n[webpack.config.js] can't build, component not existing: '${componentKey}'`);
            process.exit(1);
        }
        
        configurations = [ createBuildConfiguration(environment, dirs, component) ];
    }

    if (configurations) {
        if (dirs.assets && dirs.static) {
            const copyAssetsPlugin = new CopyWebpackPlugin({
                patterns: [{ from: dirs.assets, to: dirs.static }]
            });
            configurations[0].plugins.push(copyAssetsPlugin);
        }

        if (useDevServer) {
            configurations[0].devServer = {
                contentBase: [ dirs.output, dirs.static ],
                contentBasePublicPath: [ "/", "/" ],
                sockHost: process.env["DEV_SERVER_WEBSOCKET_HOST"],
                sockPort: process.env["DEV_SERVER_WEBSOCKET_PORT"],
                port: process.env["DEV_SERVER_PORT"],
                disableHostCheck: true,
                before: function(app /* , server, compiler */) {
                    app.get("/", function(req, res) {
                        res.redirect(`${components.default.bundle}.html`);
                    });
                },
            }
        }

        configurations.forEach(configuration => {
            if (configuration.target === "electron-main") {
                configuration.externals = {
                    "electron-reload": "commonjs2 electron-reload",
                };
            }
        });
    }

    return configurations;
}

////////////////////////////////////////////////////////////////////////////////

function createBuildConfiguration(environment, dirs, component)
{
    const isDevMode = environment.isDevMode;
    const buildMode = isDevMode ? "development" : "production";
    const componentVersion = component.version || projectVersion;
    const target = component.target || defaultTarget;

    const displayTitle = component.title + (isDevMode ? ` ${componentVersion} DEV` : "");

    const outputDir = component.subdir ? path.resolve(dirs.output, component.subdir) : dirs.output;
    mkdirp.sync(outputDir);

    const jsOutputFileName = path.join(dirs.jsFolder, "[name].js");
    const cssOutputFileName = path.join(dirs.cssFolder, "[name].css");
    const htmlOutputFileName = `${component.bundle}.html`;
    const htmlElement = component.element;

    console.log(`
WEBPACK - COMPONENT BUILD CONFIGURATION
         bundle: ${component.bundle}
         target: ${target}
          title: ${displayTitle}
        version: ${componentVersion}
  output folder: ${outputDir}
        js file: ${jsOutputFileName}
       css file: ${cssOutputFileName}
      html file: ${component.template ? htmlOutputFileName : "n/a"}
   html element: ${component.element ? htmlElement : "n/a"}
    `);

    const config = {
        mode: buildMode,
        devtool: isDevMode ? "source-map" : false,
        target: component.target || target,

        entry: {
            [component.bundle]: path.resolve(dirs.source, component.entry),
        },

        output: {
            path: outputDir,
            filename: jsOutputFileName
        },

        resolve: {
            modules,
            alias,
            extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".wasm" ],
        },

        optimization: {
            minimize: !isDevMode,

            minimizer: [
                new TerserPlugin({ parallel: true }),
                new CssMinimizerPlugin(),
            ],
        },

        plugins: [
            new webpack.DefinePlugin({
                ENV_PRODUCTION: JSON.stringify(!isDevMode),
                ENV_DEVELOPMENT: JSON.stringify(isDevMode),
                ENV_VERSION: JSON.stringify(componentVersion),
            }),
            new MiniCssExtractPlugin({
                filename: cssOutputFileName,
            }),
            new ForkTsCheckerWebpackPlugin(),
        ],

        module: {
            rules: [
                {
                    // Enforce source maps for all javascript files
                    enforce: "pre",
                    test: /\.js$/,
                    loader: "source-map-loader",
                },
                {
                    // Typescript
                    test: /\.tsx?$/,
                    use: [{
                        loader: "ts-loader",
                        options: { compilerOptions: { noEmit: false } },
                    }],
                },
                {
                    // WebAssembly
                    test: /\.wasm$/,
                    type: "javascript/auto",
                    loader: "file-loader",
                    options: {
                        name: '[path][name].[ext]',
                    },
                },
                {
                    // Raw text and shader files
                    test: /\.(txt|glsl|hlsl|frag|vert|fs|vs)$/,
                    loader: "raw-loader"
                },
                {
                    // SCSS
                    test: /\.s[ac]ss$/i,
                    use: [
                        isDevMode ? "style-loader" : MiniCssExtractPlugin.loader,
                        'css-loader',
                        'sass-loader',
                    ],
                },
                {
                    // CSS
                    test: /\.css$/,
                    use: [
                        isDevMode ? "style-loader" : MiniCssExtractPlugin.loader,
                        "css-loader",
                    ]
                },
                {
                    // Handlebars templates
                    test: /\.hbs$/,
                    loader: "handlebars-loader",
                },
            ],
        },
    };

    if (component.template) {
        config.plugins.push(new HTMLWebpackPlugin({
            filename: htmlOutputFileName,
            template: path.resolve(dirs.source, component.template),
            title: displayTitle,
            version: componentVersion,
            isDevelopment: isDevMode,
            element: htmlElement,
            chunks: [ component.bundle ],
        }));
    }

    return config;
}
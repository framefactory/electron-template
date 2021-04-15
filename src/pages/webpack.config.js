/**
 * Webpack configuration
 * Typescript / Web Components / SCSS
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

let projectVersion = "v0.0.0";
try {
    projectVersion = childProcess.execSync("git describe --tags").toString().trim();
}
catch {}

////////////////////////////////////////////////////////////////////////////////
// PROJECT / COMPONENTS

const projectDir = path.resolve(__dirname, "../..");

const dirs = {
    source: path.resolve(projectDir, "src"),
    output: path.resolve(projectDir, "app/pages"),
    modules: path.resolve(projectDir, "node_modules"),
    libs: path.resolve(projectDir, "libs"),
};

// create folders if necessary
mkdirp.sync(dirs.output)

// module search paths
const modules = [
    dirs.libs,
    dirs.modules,
];

// import aliases
const alias = {
    "client": path.resolve(dirs.source, "client"),
    "@ff/core": "@framefactory/core",
};

// project components to be built
const components = {
    "default": {
        bundle: "app",
        title: "Template",
        version: projectVersion,
        subdir: "built",
        entry: "pages/index.ts",
        template: "pages/index.hbs",
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
  library folder: ${dirs.libs}
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

    return configurations;
}

////////////////////////////////////////////////////////////////////////////////

function createBuildConfiguration(environment, dirs, component)
{
    const isDevMode = environment.isDevMode;
    const buildMode = isDevMode ? "development" : "production";
    const componentVersion = component.version || projectVersion;

    const displayTitle = `${component.title} ${componentVersion} ${isDevMode ? "DEV" : ""}`;

    const outputDir = component.subdir ? path.resolve(dirs.output, component.subdir) : dirs.output;
    mkdirp.sync(outputDir);

    const jsOutputFileName = "js/[name].js"; //isDevMode ? "js/[name].dev.js" : "js/[name].min.js";
    const cssOutputFileName = "css/[name].css"; //isDevMode ? "css/[name].dev.css" : "css/[name].min.css";
    const htmlOutputFileName = `${component.bundle}.html`;
    const htmlElement = component.element;

    console.log(`
WEBPACK - COMPONENT BUILD CONFIGURATION
        bundle: ${component.bundle}
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
            })
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
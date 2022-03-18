//@ts-check
const UserScriptPlugin = require("./webpack-user-script-plugin");
const { name: packageName } = require("./package.json");

const entry = `./source/${packageName}.user.ts`;

/** @type {import("webpack").Configuration} */
const config = {
    mode: "production",
    entry,
    plugins: [UserScriptPlugin],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    optimization: {
        minimize: false,
    },
    output: {
        path: __dirname,
        filename: `${packageName}.user.js`,
    },
};
module.exports = config;

/* eslint-disable @typescript-eslint/no-var-requires */
const rules = require("./webpack.rules");
const plugins = require("./webpack.plugins");

rules.push({
    test: /\.css$|\.s[ac]ss$/,
    use: [{ loader: "style-loader" }, { loader: "css-loader" }, { loader: "sass-loader" }],
});

module.exports = {
    entry: "./src/preload.ts",
    module: {
        rules,
    },
    plugins: plugins,
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".scss", ".sass"],
        fallback: { path: false, fs: false }
    },
};

import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import { readdirSync } from 'fs';
import copy from 'rollup-plugin-copy'

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name.replace(__dirname, ""))

const inputs = getDirectories(__dirname + "/src/pages")
const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require("child_process").spawn(
        "npm",
        ["run", "start", "--", "--dev"],
        {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true,
        }
      );

      process.on("SIGTERM", toExit);
      process.on("exit", toExit);
    },
  };
}
function createPageRollupExport(inp) {
  //nearly default config as in https://github.com/sveltejs/template
  //TODO add possibilty for different option with different inputs and destinations.
  const input = `src/pages/${inp}/${inp}.ts`;
  const output = {
    sourcemap: false,
    format: "iife",
    name: `${inp}`,
    file: `public/build/${inp}.js`,
  };
  const cssPath = `public/build/${inp}.css`;

  let def = {
    input: input,
    output: output,
    plugins: [
      svelte({
        preprocess: sveltePreprocess({ sourceMap: !production }),
        // enable run-time checks when not in production
        dev: !production,
        // we'll extract any component CSS out into
        // a separate file - better for performance
        css: (css) => {
          css.write(cssPath);
        },
      }),
      copy({
        targets: [
          { 
            src: 'src/index.html',
            dest: `public`,
            rename: (_, extension) => `${inp === "main" ? "index" : inp}.${extension}`,
            transform: (contents) => { console.log(contents.toString); return contents.toString().replace(/__name__/g, inp) },
          },
        ]
      }),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      resolve({
        browser: true,
        dedupe: ["svelte"],
      }),
      commonjs(),
      typescript({
        sourceMap: !production,
        inlineSources: !production
      }),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      inp === "main" && !production && serve(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      inp === "main" && !production && livereload("public"),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearScreen: false,
    },
  };

  return def;
}

function validateInputSettings(inp) {
  return (
    isStringNotNull(inp) ||
    (typeof inp === "object" && inp.input && inp.output && inp.css)
  );
}

function isStringNotNull(str) {
  return typeof str === "string" && str.length > 0;
}

export default (function () {
  let arrExportRollup = [];

  if (inputs instanceof Array) {
    inputs.forEach((i, index) => {
      if (validateInputSettings(i)) {
        arrExportRollup.push(createPageRollupExport(i));
      } else {
        console.warn(`skipping inputs${index} because of invalidity`);
      }
    });
  } else {
    throw new Error("inputs needs to be type of Array!");
  }
  return arrExportRollup;
})();

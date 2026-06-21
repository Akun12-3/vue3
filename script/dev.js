import esbuild from 'esbuild'
import {dirname, resolve} from 'path'
import minimist from 'minimist'
import {fileURLToPath} from 'url'
import {createRequire} from 'module'

const argv = minimist(process.argv.slice(2))
const __dirname = dirname(fileURLToPath(import.meta.url))

const target = argv._[0] || 'reactivity'
const format = argv.f ? argv.f : 'iife'
const require = createRequire(import.meta.url)
// 获取打包格式

const pkg = require(`../packages/${target}/package.json`)
const entry = resolve(__dirname,`../packages/${target}/src/index.ts`)
esbuild.context({
    entryPoints:[entry],
    outfile:resolve(__dirname,`../packages/${target}/dist/${target}.${format}.js`),
    bundle:true, //reactivity->shard 会打包到一起
    platform:'browser',
    sourcemap:true,
    format,
    globalName:pkg.buildOptions.nama
}).then(ctx=>{
    return ctx.watch()
 })
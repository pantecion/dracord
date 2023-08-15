import terser from '@rollup/plugin-terser';

export default {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/dracord.mjs',
            format: 'es'
        },
        {
            file: 'dist/dracord.cjs',
            format: 'cjs'
        },
        {
            file: 'dist/dracord.min.mjs',
            format: 'es',
            plugins: [terser()]
        },
        {
            file: 'dist/dracord.min.cjs',
            format: 'cjs',
            plugins: [terser()]
        }
    ]
};

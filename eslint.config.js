import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
import globals from 'globals';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const compat = new FlatCompat({
    baseDirectory: __dirname
});

// Workaround for https://github.com/sindresorhus/globals/issues/173
const filteredGlobals = Object.fromEntries(
    Object.entries( globals.browser ).map( ([ key, value ]) => [ key.trim(), value ])
);

export default [
    ...compat.extends( 'wordpress' ),
    {
        ignores: [ 'node_modules/**', 'dist/**' ],
        languageOptions: {
            globals: {
                ...filteredGlobals,
                ...globals.node
            }
        }
    }
];

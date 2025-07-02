import esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

const buildOptions = {
	entryPoints: [ 'as-library.js' ],
	outfile: 'dist/ant-ecs.js',
	bundle: true,
	minify: true,
	logLevel: 'info',
};

async function buildAndCopy() {
	try {
		await esbuild.build( buildOptions );

		const sourceFile = buildOptions.outfile;
		const destDir = 'examples/basic';
		const destFile = path.join( destDir, path.basename( sourceFile ) );

		await fs.mkdir( destDir, { recursive: true } );
		await fs.copyFile( sourceFile, destFile );

		console.log( `Copied ${sourceFile} to ${destFile}` );
	} catch ( e ) {
		console.error( 'Build failed:', e );
		process.exit( 1 );
	}
}

buildAndCopy();
const path = require('path');
const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	const assetsSource = path.resolve('assets', '**', '*.{png,svg}');
	const assetsDestination = path.resolve('dist', 'assets');

	src(credSource).pipe(dest(credDestination));

	return src(assetsSource).pipe(dest(assetsDestination));
}

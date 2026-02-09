const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

function run() {
	return new Promise((resolve, reject) => {
		const mocha = new Mocha({ ui: 'bdd', color: true });
		const testsRoot = path.resolve(__dirname, '../../../out/test/integration');

		// Only match .js files — TypeScript is already compiled to out/
		const testFiles = glob.sync('**/*.test.js', { cwd: testsRoot });

		for (const file of testFiles) {
			mocha.addFile(path.resolve(testsRoot, file));
		}

		mocha.run((failures) => {
			if (failures > 0) {
				reject(new Error(`${failures} tests failed.`));
			} else {
				resolve();
			}
		});
	});
}

module.exports = { run };

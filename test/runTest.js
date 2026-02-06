const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

function run() {
  const mocha = new Mocha({
    ui: 'bdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname);

  glob('**/*.test.ts', { cwd: testsRoot }, (err, files) => {
    if (err) {
      return console.error(err);
    }
    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
    mocha.run(failures => {
      process.exitCode = failures ? 1 : 0;
    });
  });
}

run();

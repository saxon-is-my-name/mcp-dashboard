const glob = require('glob');
const path = require('path');
const Mocha = require('mocha');

function run() {
  const mocha = new Mocha({
    ui: 'bdd',
    color: true
  });
  const testFiles = glob.sync(path.resolve(__dirname, '../**/*.test.{js,ts}'));
  for (const file of testFiles) {
    mocha.addFile(file);
  }
  mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
  });
}

run();
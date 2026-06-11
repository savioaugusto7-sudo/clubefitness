const fs = require('fs');
const vm = require('vm');

console.log('Reading db.js from original project...');
const dbContent = fs.readFileSync('C:\\Projects\\projetoantigravity\\db.js', 'utf8');

const result = {};
const sandbox = {
  window: {},
  localStorage: {
    getItem: () => null,
    setItem: () => null
  },
  console: console,
  result: result
};

console.log('Evaluating db.js in a safe sandbox...');
const codeToRun = dbContent + '\n; result.exercises = initialData.exercises;';

try {
  vm.runInNewContext(codeToRun, sandbox);
  const exercises = result.exercises;
  if (exercises && Array.isArray(exercises)) {
    console.log(`Successfully extracted ${exercises.length} exercises!`);
    fs.writeFileSync('exercises.json', JSON.stringify(exercises, null, 2), 'utf8');
    console.log('Saved to exercises.json');
  } else {
    console.error('Error: Exercises array not found or not an array.', typeof exercises);
  }
} catch (err) {
  console.error('Error evaluating script:', err);
}

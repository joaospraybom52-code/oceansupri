const { spawn } = require('child_process');

console.log('Iniciando o worker via NPM...');

const worker = spawn('npm.cmd', ['run', 'sync:uau'], {
    stdio: 'inherit',
    shell: true
});

worker.on('close', (code) => {
    console.log(`Worker parou com o código ${code}`);
    process.exit(code);
});

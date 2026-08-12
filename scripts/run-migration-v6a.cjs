const fs = require('fs');

async function run() {
    const prompts = JSON.parse(fs.readFileSync('EXPORT_PROMPTS_MRSL.json', 'utf8'));
    const agents = JSON.parse(fs.readFileSync('EXPORT_AGENTES_MRSL.json', 'utf8'));

    console.log(`Enviando ${prompts.length} prompts e ${agents.length} agentes...`);

    const resp = await fetch('http://localhost:8080/api/public/setup-migration-v6a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts, agents })
    });

    if (!resp.ok) {
        console.error('Falha na migração:', await resp.text());
        process.exit(1);
    }

    const results = await resp.json();
    console.log('Migração concluída:', JSON.stringify(results, null, 2));
}

run().catch(console.error);

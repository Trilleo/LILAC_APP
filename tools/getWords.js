const https = require('https');

const TOPIC = 'puzzle';
const LENGTH = 5;
const LIMIT = 50;

const wildcard = '?'.repeat(LENGTH);
const url = `https://api.datamuse.com/words?ml=${TOPIC}&sp=${wildcard}&max=${LIMIT}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const results = JSON.parse(data);

            const cleanWords = results
                .map(item => item.word.toLowerCase())
                .filter(word => /^[a-z]+$/.test(word));

            if (cleanWords.length === 0) {
                console.log("No suitable words found for that topic and length.");
                return;
            }

            const outputString = cleanWords.join(', ');

            console.log(`\nFound ${cleanWords.length} words for the topic "${TOPIC}":\n`);
            console.log('--- COPY THE TEXT BELOW ---');
            console.log(outputString);
            console.log('---------------------------\n');

        } catch (e) {
            console.error("Failed to parse API response:", e.message);
        }
    });

}).on('error', (err) => {
    console.error("API Request Error:", err.message);
});
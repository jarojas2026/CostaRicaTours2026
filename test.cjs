const https = require('https');
const fs = require('fs');

https.get('https://ais-dev-fr5dvf45e6cgev6xsr5jez-650141017629.us-east1.run.app/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
        if (match) {
            const jsUrl = 'https://ais-dev-fr5dvf45e6cgev6xsr5jez-650141017629.us-east1.run.app' + match[1];
            https.get(jsUrl, (jsRes) => {
                let jsData = '';
                jsRes.on('data', chunk => jsData += chunk);
                jsRes.on('end', () => {
                    fs.writeFileSync('rescued_js.js', jsData);
                    console.log("Rescued JS bundle!");
                });
            });
        }
    });
});

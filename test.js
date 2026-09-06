const axios = require('axios');
const fs = require('fs');
(async () => {
    try {
        const response = await axios.get('https://ais-dev-fr5dvf45e6cgev6xsr5jez-650141017629.us-east1.run.app/assets/');
        console.log(response.data.substring(0, 500));
    } catch (e) { console.log("Failed") }
})();

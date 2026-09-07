const fs = require('fs');
let code = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');

code = code.replace(/import \{ formatCurrency \} from '\.\.\/App';/g, "import { formatCurrency } from '../utils/i18n';");
code = code.replace(/import \{ Language, TourRegion, TourCategory \} from '\.\.\/types';/g, "import { Language, TourRegion, TourCategory, Currency } from '../types';");

fs.writeFileSync('src/components/HeroSection.tsx', code);

// also fix apiManager ts errors
let apiCode = fs.readFileSync('src/lib/apiManager.ts', 'utf8');
// Fix missing headers argument
apiCode = apiCode.replace(/async get\(endpoint, headers\) \{ return this\.request\(endpoint, 'GET', null, headers\); \}/g, "async get(endpoint, headers = {}) { return this.request(endpoint, 'GET', null, headers); }");
apiCode = apiCode.replace(/async post\(endpoint, data, headers\) \{ return this\.request\(endpoint, 'POST', data, headers\); \}/g, "async post(endpoint, data = null, headers = {}) { return this.request(endpoint, 'POST', data, headers); }");
apiCode = apiCode.replace(/async put\(endpoint, data, headers\) \{ return this\.request\(endpoint, 'PUT', data, headers\); \}/g, "async put(endpoint, data = null, headers = {}) { return this.request(endpoint, 'PUT', data, headers); }");
apiCode = apiCode.replace(/async delete\(endpoint, headers\) \{ return this\.request\(endpoint, 'DELETE', null, headers\); \}/g, "async delete(endpoint, headers = {}) { return this.request(endpoint, 'DELETE', null, headers); }");

fs.writeFileSync('src/lib/apiManager.ts', apiCode);

const fs = require('fs');
let code = fs.readFileSync('src/lib/apiManager.ts', 'utf8');

// TS error fix: remove default params in interface/method if it's complaining about expected arguments
// "Expected 3 arguments, but got 2" in apiManager and n8nTriggers.
// Our `request(endpoint, method, data, headers)` might be required.
code = code.replace(/async get\(endpoint, headers = \{\}\)/g, "async get(endpoint: string, headers: any = {})");
code = code.replace(/async request\(endpoint, method = 'GET', data = null, customHeaders = \{\}\)/g, "async request(endpoint: string, method: string = 'GET', data: any = null, customHeaders: any = {})");
// Actually, it's vanilla JS/TS, let's just add `any` so TS shuts up.

code = code.replace(/async get\(endpoint, headers = \{\}\) \{ return this\.request\(endpoint, 'GET', null, headers\); \}/g, "async get(endpoint: string, headers: any = {}) { return this.request(endpoint, 'GET', null, headers); }");
code = code.replace(/async post\(endpoint, data = null, headers = \{\}\) \{ return this\.request\(endpoint, 'POST', data, headers\); \}/g, "async post(endpoint: string, data: any = null, headers: any = {}) { return this.request(endpoint, 'POST', data, headers); }");
code = code.replace(/async put\(endpoint, data = null, headers = \{\}\) \{ return this\.request\(endpoint, 'PUT', data, headers\); \}/g, "async put(endpoint: string, data: any = null, headers: any = {}) { return this.request(endpoint, 'PUT', data, headers); }");
code = code.replace(/async delete\(endpoint, headers = \{\}\) \{ return this\.request\(endpoint, 'DELETE', null, headers\); \}/g, "async delete(endpoint: string, headers: any = {}) { return this.request(endpoint, 'DELETE', null, headers); }");

fs.writeFileSync('src/lib/apiManager.ts', code);

const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Add import
const importCron = "import { CronDashboard } from './CronDashboard';\n";
content = content.replace("import { N8NWorkflowStudio } from './N8NWorkflowStudio';", importCron + "import { N8NWorkflowStudio } from './N8NWorkflowStudio';");

// Add Tab Button
const oldTabs = `          <button
            onClick={() => setActiveTab('n8n')}
            className={\`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors \${
              activeTab === 'n8n'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            <Network className="w-5 h-5" />
            n8n Workflows
          </button>`;

const newTabs = oldTabs + `
          <button
            onClick={() => setActiveTab('cron')}
            className={\`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors \${
              activeTab === 'cron'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            <Activity className="w-5 h-5" />
            Cron Engine
          </button>`;

content = content.replace(oldTabs, newTabs);

// Add Tab Content
const oldContent = `          {activeTab === 'n8n' && (
            <div className="py-1">
              <N8NWorkflowStudio language={language || 'es'} />
            </div>
          )}`;

const newContent = oldContent + `
          {activeTab === 'cron' && (
            <div className="py-1">
              <CronDashboard language={language || 'es'} />
            </div>
          )}`;

fs.writeFileSync('src/components/AdminDashboard.tsx', content);

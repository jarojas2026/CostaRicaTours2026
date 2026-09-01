const fs = require('fs');
let content = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

const progressIndicatorComponent = `
const BookingProgressIndicator = ({ 
  status, 
  language 
}: { 
  status: 'none' | 'pending' | 'payment_required' | 'confirmed', 
  language: Language 
}) => {
  if (status === 'none') return null;
  
  const steps = [
    { id: 'pending', label: language === 'es' ? 'Pendiente' : 'Pending', icon: Clock },
    { id: 'payment_required', label: language === 'es' ? 'Pago Requerido' : 'Payment', icon: AlertCircle },
    { id: 'confirmed', label: language === 'es' ? 'Confirmado' : 'Confirmed', icon: CheckCircle2 }
  ];
  
  const getCurrentStepIndex = () => {
    switch (status) {
      case 'pending': return 0;
      case 'payment_required': return 1;
      case 'confirmed': return 2;
      default: return -1;
    }
  };
  
  const currentIndex = getCurrentStepIndex();

  return (
    <div className="bg-slate-50 border-b border-slate-200 p-3 shadow-sm shrink-0">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1 z-10 relative">
                <div className={\`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-500 \${isActive ? (isCurrent ? (step.id === 'payment_required' ? 'border-amber-500 bg-amber-50 text-amber-600 shadow-sm' : 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm') : 'border-emerald-500 bg-emerald-500 text-white') : 'border-slate-200 bg-white text-slate-300'}\`}>
                  {isActive && !isCurrent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={\`text-[9px] font-bold uppercase tracking-wider \${isActive ? 'text-slate-800' : 'text-slate-400'}\`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-1 relative overflow-hidden bg-slate-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: idx < currentIndex ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-emerald-500 h-full" 
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
`;

// Insert after the MessageStatus component definition
content = content.replace('const keywordsToTourId: Record<string, string> = {', progressIndicatorComponent + '\nconst keywordsToTourId: Record<string, string> = {');

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', content);

import re

with open('src/components/FloatingWhatsApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add CheckCheck
content = content.replace("CheckCircle2,", "CheckCircle2, CheckCheck,")

# Add the component
component = """
const MessageStatus = ({ isBot }: { isBot?: boolean }) => {
  const [isRead, setIsRead] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setIsRead(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <span className="inline-flex items-end gap-1 ml-2 float-right mt-1">
      <span className="text-[10px] opacity-60 leading-none">
        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </span>
      {!isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-neutral-400'}`} />}
      {isBot && <CheckCheck className={`w-3.5 h-3.5 leading-none ${isRead ? 'text-[#34B7F1]' : 'text-neutral-400'}`} />}
    </span>
  );
};

export const FloatingWhatsApp"""

content = content.replace("export const FloatingWhatsApp", component)

with open('src/components/FloatingWhatsApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

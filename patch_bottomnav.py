import re

with open('src/components/BottomNav.tsx', 'r') as f:
    content = f.read()

new_comp = """
export const BottomNav: React.FC<BottomNavProps> = ({ language, activeTab, setActiveTab }) => {
  const t = (es: string, en: string) => language === 'es' ? es : en;
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > lastScrollY && currentScrollY > 150) {
            setIsScrollingDown(true);
          } else if (currentScrollY < lastScrollY) {
            setIsScrollingDown(false);
          }
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className={`xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F2F1D]/90 backdrop-blur-md border-t border-emerald-500/30 safe-area-bottom pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${isScrollingDown ? "translate-y-full" : "translate-y-0"}`}>
"""

# The file might not have exactly that text, let's use a simpler regex
content = re.sub(
    r"export const BottomNav: React\.FC<BottomNavProps> = \(\{ language, activeTab, setActiveTab \}\) => \{.*?return \(\s*<div className=\"xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-\[#0F2F1D\]/90 backdrop-blur-md border-t border-emerald-500/30 safe-area-bottom pb-\[env\(safe-area-inset-bottom\)\]\">",
    new_comp,
    content,
    flags=re.DOTALL
)

with open('src/components/BottomNav.tsx', 'w') as f:
    f.write(content)

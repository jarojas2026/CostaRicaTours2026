import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

# Add a state for isScrollingDown
content = content.replace(
    'const [isScrolled, setIsScrolled] = useState(false);',
    'const [isScrolled, setIsScrolled] = useState(false);\n  const [isScrollingDown, setIsScrollingDown] = useState(false);\n  const [lastScrollY, setLastScrollY] = useState(0);'
)

# Update scroll listener
new_scroll_effect = """
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setIsScrolled(currentScrollY > 50);
          
          if (currentScrollY > lastScrollY && currentScrollY > 150) {
            setIsScrollingDown(true);
            setIsLangMenuOpen(false); // Close menus on scroll down
            setIsCurrencyMenuOpen(false);
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
"""

content = re.sub(
    r"  useEffect\(\(\) => \{\n    const handleScroll = \(\) => \{\n      setIsScrolled\(window\.scrollY > 50\);\n    \};\n    window\.addEventListener\('scroll', handleScroll\);\n    return \(\) => window\.removeEventListener\('scroll', handleScroll\);\n  \}, \[\]\);",
    new_scroll_effect,
    content
)

# Apply classes to the header to hide it
content = content.replace(
    'className={`bg-[#0F2F1D]/80 backdrop-blur-md border-b lg:border border-emerald-500/30 text-neutral-100 fixed top-0 left-0 right-0 z-[100] shadow-2xl transition-all duration-300 lg:top-3 lg:mx-4 lg:rounded-2xl`}',
    'className={`bg-[#0F2F1D]/80 backdrop-blur-md border-b lg:border border-emerald-500/30 text-neutral-100 fixed top-0 left-0 right-0 z-[100] shadow-2xl transition-all duration-300 lg:mx-4 lg:rounded-2xl ${isScrollingDown ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"} ${isScrolled ? "lg:top-2" : "lg:top-3"}`}'
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)

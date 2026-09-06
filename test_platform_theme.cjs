const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

// I will add a useEffect in FloatingWhatsApp to inject global CSS vars if we select a platform theme.
const themeInjection = `
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'costa_rica') {
      root.style.setProperty('--app-stone-950', '#1D3557');
      root.style.setProperty('--app-stone-900', '#25446E');
      root.style.setProperty('--app-stone-850', '#2E5487');
      root.style.setProperty('--app-stone-800', '#3965A1');
      root.style.setProperty('--app-stone-700', '#4E7BB8');
    } else if (theme === 'emerald') {
      root.style.setProperty('--app-stone-950', '#1B4965');
      root.style.setProperty('--app-stone-900', '#22577A');
      root.style.setProperty('--app-stone-850', '#2C688F');
      root.style.setProperty('--app-stone-800', '#387CA8');
      root.style.setProperty('--app-stone-700', '#4B94C2');
    } else if (theme === 'ocean') {
      root.style.setProperty('--app-stone-950', '#03045E');
      root.style.setProperty('--app-stone-900', '#023E8A');
      root.style.setProperty('--app-stone-850', '#0077B6');
      root.style.setProperty('--app-stone-800', '#0096C7');
      root.style.setProperty('--app-stone-700', '#00B4D8');
    } else if (theme === 'volcano') {
      root.style.setProperty('--app-stone-950', '#370617');
      root.style.setProperty('--app-stone-900', '#6A040F');
      root.style.setProperty('--app-stone-850', '#9D0208');
      root.style.setProperty('--app-stone-800', '#D00000');
      root.style.setProperty('--app-stone-700', '#DC2F02');
    } else if (theme === 'rainforest') {
      root.style.setProperty('--app-stone-950', '#081C15');
      root.style.setProperty('--app-stone-900', '#1B4332');
      root.style.setProperty('--app-stone-850', '#2D6A4F');
      root.style.setProperty('--app-stone-800', '#40916C');
      root.style.setProperty('--app-stone-700', '#52B788');
    } else if (theme === 'orchid') {
      root.style.setProperty('--app-stone-950', '#240046');
      root.style.setProperty('--app-stone-900', '#3C096C');
      root.style.setProperty('--app-stone-850', '#5A189A');
      root.style.setProperty('--app-stone-800', '#7B2CBF');
      root.style.setProperty('--app-stone-700', '#9D4EDD');
    } else if (theme === 'gold') {
      root.style.setProperty('--app-stone-950', '#1A1A1A');
      root.style.setProperty('--app-stone-900', '#2D2D2D');
      root.style.setProperty('--app-stone-850', '#333333');
      root.style.setProperty('--app-stone-800', '#404040');
      root.style.setProperty('--app-stone-700', '#595959');
    } else if (theme === 'minimalist') {
      root.style.setProperty('--app-stone-950', '#111111');
      root.style.setProperty('--app-stone-900', '#222222');
      root.style.setProperty('--app-stone-850', '#333333');
      root.style.setProperty('--app-stone-800', '#444444');
      root.style.setProperty('--app-stone-700', '#555555');
    } else if (theme === 'sky') {
      root.style.setProperty('--app-stone-950', '#03045E');
      root.style.setProperty('--app-stone-900', '#0077B6');
      root.style.setProperty('--app-stone-850', '#0096C7');
      root.style.setProperty('--app-stone-800', '#00B4D8');
      root.style.setProperty('--app-stone-700', '#48CAE4');
    } else if (theme === 'sunset') {
      root.style.setProperty('--app-stone-950', '#264653');
      root.style.setProperty('--app-stone-900', '#2A9D8F');
      root.style.setProperty('--app-stone-850', '#E9C46A');
      root.style.setProperty('--app-stone-800', '#F4A261');
      root.style.setProperty('--app-stone-700', '#E76F51');
    }
  }, [theme]);
`;

code = code.replace("  const prevIsOpenRef = React.useRef(isOpen);", themeInjection + "\n  const prevIsOpenRef = React.useRef(isOpen);");
fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
